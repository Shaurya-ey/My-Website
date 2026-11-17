
export default async function handler(req, res) {
  // Allow only GET requests
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const token = process.env.GITHUB_TOKEN;
  const username = "Shaurya-ey";

  if (!token) {
    return res.status(500).json({
      error: "GitHub API token is not configured"
    });
  }

  const to = new Date();
  const from = new Date(to);

  // Fetch approximately one year of contributions
  from.setUTCDate(from.getUTCDate() - 364);

  const query = `
    query (
      $username: String!
      $from: DateTime!
      $to: DateTime!
    ) {
      user(login: $username) {
        contributionsCollection(
          from: $from
          to: $to
        ) {
          contributionCalendar {
            totalContributions

            weeks {
              contributionDays {
                date
                contributionCount
                color
              }
            }

            months {
              name
              firstDay
              totalWeeks
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(
      "https://api.github.com/graphql",
      {
        method: "POST",

        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "Shaurya-Portfolio"
        },

        body: JSON.stringify({
          query,

          variables: {
            username,
            from: from.toISOString(),
            to: to.toISOString()
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok || result.errors) {
      console.error("GitHub GraphQL error:", result.errors);

      return res.status(502).json({
        error: "Unable to fetch GitHub contributions"
      });
    }

    const calendar =
      result.data?.user?.contributionsCollection
        ?.contributionCalendar;

    if (!calendar) {
      return res.status(404).json({
        error: "GitHub contribution calendar not found"
      });
    }

    // Cache data for 15 minutes
    res.setHeader(
      "Cache-Control",
      "s-maxage=900, stale-while-revalidate=3600"
    );

    return res.status(200).json({
      username,
      totalContributions: calendar.totalContributions,
      weeks: calendar.weeks,
      months: calendar.months,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("GitHub API error:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
}
