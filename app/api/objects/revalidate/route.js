// import { GetBucketObjects } from "../../../util/GetBucketObjects";

import {
  GetRevalidateVersion,
  UpdateRevalidateVersion,
} from "../../../../util/RevalidateVersion";

export async function GET() {
  // await revalidatePath("/gallery");
  UpdateRevalidateVersion();

  return Response.json({
    status: "ok",
    revalidateVersion: GetRevalidateVersion(),
  });
}
