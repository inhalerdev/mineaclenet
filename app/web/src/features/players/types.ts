export type PlayerPreview = {
  uuid: string | null;
  username: string;
  displayName: string;
  rankLabel: string | null;
  metricLabel: string;
  metricValue: string;
};

export type TeamPreview = {
  id: string | null;
  name: string;
  memberCount: number | null;
  metricLabel: string;
  metricValue: string;
};
