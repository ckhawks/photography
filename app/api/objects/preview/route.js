// import { GetBucketObjects } from "../../../util/GetBucketObjects";

import { cache } from "react";

import { GetNumberOfBucketObjectsRandom } from "../../../../util/GetBucketObjects";

const getCachedObjectsPerPrefixClient = cache(async (prefix) => {
  const NUM_ITEMS_TO_SHOW = 3;

  return await GetNumberOfBucketObjectsRandom(prefix, NUM_ITEMS_TO_SHOW);
});

export async function GET(request) {
  // const requestBody = request.json();
  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get("prefix");
  // const client_id = searchParams.get("client");
  if (!prefix) return Response.json({ status: "no" });
  // if (!client_id) return Response.json({ status: "nooo" });
  // const res = await fetch(`https://data.mongodb-api.com/product/${id}`, {
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'API-Key': process.env.DATA_API_KEY,
  //   },
  // })
  // console.log(requestBody);
  // await revalidatePath("/gallery");
  // UpdateRevalidateVersion();

  const items = await getCachedObjectsPerPrefixClient(prefix);

  return Response.json({
    prefix: prefix,
    items: items,
  });
}
