import { Credential } from "@prisma/client";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import CalEventParser from "@lib/CalEventParser";
import { AdditionInformation, EntryPoint } from "@lib/emails/EventMail";
import { getIntegrationName } from "@lib/emails/helpers";
import { EventResult } from "@lib/events/EventManager";
import logger from "@lib/logger";

import { CalendarEvent } from "./calendarClient";
import { symmetricDecrypt, symmetricEncrypt } from "./crypto";
import EventAttendeeRescheduledMail from "./emails/EventAttendeeRescheduledMail";
import EventOrganizerRescheduledMail from "./emails/EventOrganizerRescheduledMail";
import VideoEventAttendeeMail from "./emails/VideoEventAttendeeMail";
import VideoEventOrganizerMail from "./emails/VideoEventOrganizerMail";
import prisma from "./prisma";

const log = logger.getChildLogger({ prefix: ["[lib] videoClient"] });

const translator = short();

export interface ZoomToken {
  scope: "meeting:write";
  expires_in: number;
  token_type: "bearer";
  access_token: string;
  refresh_token: string;
}

export interface VideoCallData {
  type: string;
  id: string;
  password: string;
  url: string;
}

function handleErrorsJson(response) {
  if (!response.ok) {
    response.json().then(console.log);
    throw Error(response.statusText);
  }
  return response.json();
}

function handleErrorsRaw(response) {
  if (!response.ok) {
    response.text().then(console.log);
    throw Error(response.statusText);
  }
  return response.text();
}

export const zoomAuth = (credential: Credential) => {
  const encryptedCredentialKey = credential.key;
  const credentialKey = JSON.parse(
    symmetricDecrypt(encryptedCredentialKey, process.env.CALENDSO_ENCRYPTION_KEY as string)
  ) as unknown as ZoomToken;
  const isExpired = (expiryDate: number) => expiryDate < +new Date();
  const authHeader =
    "Basic " +
    Buffer.from(process.env.ZOOM_CLIENT_ID + ":" + process.env.ZOOM_CLIENT_SECRET).toString("base64");

  const refreshAccessToken = (refreshToken: string) =>
    fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })
      .then(handleErrorsJson)
      .then(async (responseBody) => {
        // Store new tokens in database.
        await prisma.credential.update({
          where: {
            id: credential.id,
          },
          data: {
            key: symmetricEncrypt(
              JSON.stringify(responseBody),
              process.env.CALENDSO_ENCRYPTION_KEY as string
            ),
          },
        });
        credentialKey.access_token = responseBody.access_token;
        credentialKey.expires_in = Math.round(+new Date() / 1000 + responseBody.expires_in);
        return credentialKey.access_token;
      });

  return {
    getToken: () =>
      !isExpired(credentialKey.expires_in)
        ? Promise.resolve(credentialKey.access_token)
        : refreshAccessToken(credentialKey.refresh_token),
  };
};

interface VideoApiAdapter {
  createMeeting(event: CalendarEvent): Promise<any>;

  updateMeeting(uid: string, event: CalendarEvent): Promise<any>;

  deleteMeeting(uid: string): Promise<unknown>;

  getAvailability(dateFrom: string, dateTo: string): Promise<any>;
}

const ZoomVideo = (credential: Credential): VideoApiAdapter => {
  const auth = zoomAuth(credential);

  const translateEvent = (event: CalendarEvent) => {
    // Documentation at: https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
    return {
      topic: event.title,
      type: 2, // Means that this is a scheduled meeting
      start_time: event.startTime,
      duration: (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000,
      //schedule_for: "string",   TODO: Used when scheduling the meeting for someone else (needed?)
      timezone: event.attendees[0].timeZone,
      //password: "string",       TODO: Should we use a password? Maybe generate a random one?
      agenda: event.description,
      settings: {
        host_video: true,
        participant_video: true,
        cn_meeting: false, // TODO: true if host meeting in China
        in_meeting: false, // TODO: true if host meeting in India
        join_before_host: true,
        mute_upon_entry: false,
        watermark: false,
        use_pmi: false,
        approval_type: 2,
        audio: "both",
        auto_recording: "none",
        enforce_login: false,
        registrants_email_notification: true,
      },
    };
  };

  return {
    getAvailability: () => {
      return auth
        .getToken()
        .then(
          // TODO Possibly implement pagination for cases when there are more than 300 meetings already scheduled.
          (accessToken) =>
            fetch("https://api.zoom.us/v2/users/me/meetings?type=scheduled&page_size=300", {
              method: "get",
              headers: {
                Authorization: "Bearer " + accessToken,
              },
            })
              .then(handleErrorsJson)
              .then((responseBody) => {
                return responseBody.meetings.map((meeting) => ({
                  start: meeting.start_time,
                  end: new Date(
                    new Date(meeting.start_time).getTime() + meeting.duration * 60000
                  ).toISOString(),
                }));
              })
        )
        .catch((err) => {
          console.error(err);
          /* Prevents booking failure when Zoom Token is expired */
          return [];
        });
    },
    createMeeting: (event: CalendarEvent) =>
      auth.getToken().then((accessToken) =>
        fetch("https://api.zoom.us/v2/users/me/meetings", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(translateEvent(event)),
        }).then(handleErrorsJson)
      ),
    deleteMeeting: (uid: string) =>
      auth.getToken().then((accessToken) =>
        fetch("https://api.zoom.us/v2/meetings/" + uid, {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + accessToken,
          },
        }).then(handleErrorsRaw)
      ),
    updateMeeting: (uid: string, event: CalendarEvent) =>
      auth.getToken().then((accessToken) =>
        fetch("https://api.zoom.us/v2/meetings/" + uid, {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(translateEvent(event)),
        }).then(handleErrorsRaw)
      ),
  };
};

// factory
const videoIntegrations = (withCredentials: Credential[]): VideoApiAdapter[] =>
  withCredentials.reduce<VideoApiAdapter[]>((acc, cred) => {
    switch (cred.type) {
      case "zoom_video":
        acc.push(ZoomVideo(cred));
        break;
      default:
        break;
    }
    return acc;
  }, []);

const getBusyVideoTimes: (withCredentials: Credential[]) => Promise<unknown[]> = (withCredentials) =>
  Promise.all(videoIntegrations(withCredentials).map((c) => c.getAvailability())).then((results) =>
    results.reduce((acc, availability) => acc.concat(availability), [])
  );

const createMeeting = async (
  credential: Credential,
  calEvent: CalendarEvent,
  maybeUid?: string
): Promise<EventResult> => {
  const parser: CalEventParser = new CalEventParser(calEvent, maybeUid);
  const uid: string = parser.getUid();

  if (!credential) {
    throw new Error(
      "Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set."
    );
  }

  let success = true;

  const creationResult = await videoIntegrations([credential])[0]
    .createMeeting(calEvent)
    .catch((e) => {
      log.error("createMeeting failed", e, calEvent);
      success = false;
    });

  const videoCallData: VideoCallData = {
    type: credential.type,
    id: creationResult.id,
    password: creationResult.password,
    url: creationResult.join_url,
  };

  const entryPoint: EntryPoint = {
    entryPointType: getIntegrationName(videoCallData),
    uri: videoCallData.url,
    label: "Enter Meeting",
    pin: videoCallData.password,
  };

  const additionInformation: AdditionInformation = {
    entryPoints: [entryPoint],
  };

  const organizerMail = new VideoEventOrganizerMail(calEvent, uid, videoCallData, additionInformation);
  const attendeeMail = new VideoEventAttendeeMail(calEvent, uid, videoCallData, additionInformation);
  try {
    await organizerMail.sendEmail();
  } catch (e) {
    console.error("organizerMail.sendEmail failed", e);
  }

  if (!creationResult || !creationResult.disableConfirmationEmail) {
    try {
      await attendeeMail.sendEmail();
    } catch (e) {
      console.error("attendeeMail.sendEmail failed", e);
    }
  }

  return {
    type: credential.type,
    success,
    uid,
    createdEvent: creationResult,
    originalEvent: calEvent,
    videoCallData: videoCallData,
  };
};

const updateMeeting = async (
  credential: Credential,
  uidToUpdate: string,
  calEvent: CalendarEvent
): Promise<EventResult> => {
  const newUid: string = translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));

  if (!credential) {
    throw new Error(
      "Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set."
    );
  }

  let success = true;

  const updateResult = credential
    ? await videoIntegrations([credential])[0]
        .updateMeeting(uidToUpdate, calEvent)
        .catch((e) => {
          log.error("updateMeeting failed", e, calEvent);
          success = false;
        })
    : null;

  const organizerMail = new EventOrganizerRescheduledMail(calEvent, newUid);
  const attendeeMail = new EventAttendeeRescheduledMail(calEvent, newUid);
  try {
    await organizerMail.sendEmail();
  } catch (e) {
    console.error("organizerMail.sendEmail failed", e);
  }

  if (!updateResult || !updateResult.disableConfirmationEmail) {
    try {
      await attendeeMail.sendEmail();
    } catch (e) {
      console.error("attendeeMail.sendEmail failed", e);
    }
  }

  return {
    type: credential.type,
    success,
    uid: newUid,
    updatedEvent: updateResult,
    originalEvent: calEvent,
  };
};

const deleteMeeting = (credential: Credential, uid: string): Promise<unknown> => {
  if (credential) {
    return videoIntegrations([credential])[0].deleteMeeting(uid);
  }

  return Promise.resolve({});
};

export { getBusyVideoTimes, createMeeting, updateMeeting, deleteMeeting };
