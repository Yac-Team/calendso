import EventMail from "./EventMail";

export default class EventOrganizerMail extends EventMail {
  protected getBodyHeader(): string {
    return "A new async meeting has been scheduled.";
  }

  protected getAdditionalFooter(): string {
    return `<p style="color: #4b5563; margin-top: 20px;">Want to see more? <a href=${
      process.env.BASE_URL + "/bookings"
    } style="color: #161e2e;">Manage my bookings</a></p>`;
  }

  protected getImage(): string {
    return `<svg
      xmlns="http://www.w3.org/2000/svg"
      style="height: 60px; width: 60px; color: #31c48d"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>`;
  }

  /**
   * Returns the email text as HTML representation.
   *
   * @protected
   */
  protected getHtmlRepresentation(): string {
    return (
      `
<body style="background: #141414; font-family: Helvetica, sans-serif">
  <div style="text-align: center; margin-top: 40px; color: #ccc; font-size: 12px;">
    <img style="width: 170px;" src="https://meet.yac.com/yac-logo-white-word.svg" alt="Yac Logo"></div>
  <div
    style="
      margin: 0 auto;
      max-width: 450px;
      background: white;
      border-radius: 0.75rem;
      border: 1px solid #e5e7eb;
      padding: 2rem 2rem 2rem 2rem;
      text-align: center;
      margin-top: 40px;
    "
  >
    ${this.getImage()}
    <h1 style="font-weight: 500; color: #161e2e;">${this.getBodyHeader()}</h1>
    <hr />
    <table style="border-spacing: 20px; color: #161e2e; margin-bottom: 10px;">
      <colgroup>
        <col span="1" style="width: 40%;">
        <col span="1" style="width: 60%;">
     </colgroup>
      <tr>
        <td>What</td>
        <td>${this.calEvent.type}</td>
      </tr>
      <tr>
        <td>Who</td>
        <td>${this.calEvent.attendees[0].name}<br /><small><a href="mailto:${
        this.calEvent.attendees[0].email
      }">${this.calEvent.attendees[0].email}</a></small></td>
      </tr>
      <tr>
        <td>Where</td>
        <td>${this.getLocation()}</td>
      </tr>
      <tr>
        <td>Notes</td>
        <td>${this.calEvent.description}</td>
      </tr>
    </table>
    ` +
      this.getAdditionalBody() +
      "<br />" +
      `
    <hr />
    ` +
      this.getAdditionalFooter() +
      `
  </div>
</body>
    `
    );
  }

  /**
   * Adds the video call information to the mail body.
   *
   * @protected
   */
  protected getLocation(): string {
    return this.calEvent.location
      ? `<a href="${this.calEvent.location}" >${this.calEvent.location}</a><br />`
      : "";
  }

  protected getAdditionalBody(): string {
    return ``;
  }
  /**
   * Returns the payload object for the nodemailer.
   *
   * @protected
   */
  protected getNodeMailerPayload(): Record<string, unknown> {
    const toAddresses = [this.calEvent.organizer.email];
    if (this.calEvent.team) {
      this.calEvent.team.members.forEach((member) => {
        const memberAttendee = this.calEvent.attendees.find((attendee) => attendee.name === member);
        if (memberAttendee) {
          toAddresses.push(memberAttendee.email);
        }
      });
    }

    return {
      from: `Yac Meet <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: this.getSubject(),
      html: this.getHtmlRepresentation(),
      text: this.getPlainTextRepresentation(),
    };
  }

  protected getSubject(): string {
    return `New async meeting: ${this.calEvent.attendees[0].name} - ${this.calEvent.type}`;
  }

  protected printNodeMailerError(error: string): void {
    console.error("SEND_NEW_EVENT_NOTIFICATION_ERROR", this.calEvent.organizer.email, error);
  }
}
