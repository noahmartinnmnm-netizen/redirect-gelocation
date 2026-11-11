/**
 * Public keep-alive / health check for uptime monitors (e.g. UptimeRobot).
 * GET https://<your-host>/api/health
 */
export const loader = async () => {
  return Response.json(
    {
      status: "ok",
      service: "redirect-location",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
};
