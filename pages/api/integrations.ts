import { getSession } from "@lib/auth";
import { zoomAuth } from "@lib/videoClient";

import prisma from "../../lib/prisma";

const client_id = process.env.ZOOM_CLIENT_ID;
const client_secret = process.env.ZOOM_CLIENT_SECRET;

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Check that user is authenticated
    const session = await getSession({ req: req });

    if (!session) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    const credentials = await prisma.credential.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        type: true,
      },
    });

    res.status(200).json(credentials);
  }

  if (req.method == "DELETE") {
    const session = await getSession({ req: req });

    if (!session) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    const id = req.body.id;

    const credential = await prisma.credential.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        type: true,
        key: true,
        userId: true,
      },
    });

    if (credential?.type === "zoom_video") {
      try {
        const token = await zoomAuth(credential).getToken();
        const authHeader = "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64");
        await fetch("https://zoom.us/oauth/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: authHeader },
          body: new URLSearchParams({
            token,
          }),
        });
      } catch (error) {
        console.error("Error revoking zoom token", error);
      }
    }

    await prisma.credential.delete({
      where: {
        id: id,
      },
    });

    res.status(200).json({ message: "Integration deleted successfully" });
  }
}
