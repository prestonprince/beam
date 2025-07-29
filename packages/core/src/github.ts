import type { Octokit } from "@octokit/rest";

type BaseArgs = {
  octokit: Octokit;
};

export const GitHub = {
  users: {
    getEmail: async ({ octokit }: BaseArgs) => {
      const { data } = await octokit.rest.users.getAuthenticated();
      return data.email;
    },

    getProfile: async ({ octokit }: BaseArgs) => {
      const { data } = await octokit.rest.users.getAuthenticated();
      return data;
    },
  },

  repos: {},

  issues: {},
} as const;
