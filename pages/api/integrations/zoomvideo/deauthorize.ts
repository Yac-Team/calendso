import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "../../../../lib/prisma";

type ZoomDeauthorizationRequestBody = {
  event: "app_deauthorized";
  payload: {
    account_id: string;
    user_id: string;
    signature: string;
    deauthorization_time: string;
    client_id: string;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const body = req.body as ZoomDeauthorizationRequestBody;

    const zoomCredential = await prisma.credential.findFirst({
      where: {
        AND: {
          type: "zoom_video",
          userId: Number(body.payload.user_id),
        },
      },
      select: {
        id: true,
      },
    });

    if (zoomCredential && zoomCredential.id) {
      await prisma.credential.delete({
        where: {
          id: zoomCredential?.id,
        },
      });
    }

    res.status(200);
  }
}
