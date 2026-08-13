import type { NextApiRequest, NextApiResponse } from "next";

import { getLimits } from "./server";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const limits = await getLimits({ teamId: "self-hosted", userId: "local" });
  return res.status(200).json({ ...limits, dataroomUpload: false });
}
