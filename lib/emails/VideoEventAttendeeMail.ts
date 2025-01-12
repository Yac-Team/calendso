import { AdditionInformation } from "@lib/emails/EventMail";

import { CalendarEvent } from "../calendarClient";
import { VideoCallData } from "../videoClient";
import EventAttendeeMail from "./EventAttendeeMail";
import { getFormattedMeetingId, getIntegrationName } from "./helpers";

export default class VideoEventAttendeeMail extends EventAttendeeMail {
  videoCallData: VideoCallData;

  constructor(
    calEvent: CalendarEvent,
    uid: string,
    videoCallData: VideoCallData,
    additionInformation: AdditionInformation = null
  ) {
    super(calEvent, uid);
    this.videoCallData = videoCallData;
    this.additionInformation = additionInformation;
  }

  /**
   * Adds the video call information to the mail body.
   *
   * @protected
   */
  protected getAdditionalBody(): string {
    const meetingPassword = this.videoCallData.password;
    const meetingId = getFormattedMeetingId(this.videoCallData);

    if (meetingId && meetingPassword) {
      return `
      <strong>Video call provider:</strong> ${getIntegrationName(this.videoCallData)}<br />
      <strong>Meeting ID:</strong> ${getFormattedMeetingId(this.videoCallData)}<br />
      <strong>Meeting Password:</strong> ${
        this.videoCallData.password || "This meeting doesn’t require a password."
      }<br />
      <strong>Meeting URL:</strong> <a href="${this.videoCallData.url}">${this.videoCallData.url}</a><br />
    `;
    }

    return `
      <strong>Video call provider:</strong> ${getIntegrationName(this.videoCallData)}<br />
      <strong>Meeting URL:</strong> <a href="${this.videoCallData.url}">${this.videoCallData.url}</a><br />
    `;
  }
}
