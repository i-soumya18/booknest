import { fetchApi } from "@/lib/api/client";
import { ActivityEvent, PaginatedResponse } from "@/types";

export async function getActivityFeed(
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<ActivityEvent>> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  return fetchApi<PaginatedResponse<ActivityEvent>>(`/api/v1/activity?${params.toString()}`);
}
