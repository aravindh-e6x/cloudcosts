export interface Workspace {
  id: string
  name: string
  database: string
  region?: string
}

export const workspaces: Workspace[] = [
  {
    id: "k3d-cloudcosts",
    name: "Cisco",
    database: "k3d_cloudcosts",
    region: "local",
  },
   {
    id: "k3d-cloudcosts1",
    name: "Freshworks",
    database: "k3d_cloudcosts",
    region: "local",
  },
   {
    id: "k3d-cloudcosts2",
    name: "Condenast",
    database: "k3d_cloudcosts",
    region: "local",
  },
   {
    id: "k3d-cloudcosts3",
    name: "Tekion",
    database: "k3d_cloudcosts",
    region: "local",
  },
   {
    id: "k3d-cloudcosts4",
    name: "Zepto",
    database: "k3d_cloudcosts",
    region: "local",
  },
]

export function getWorkspace(id: string): Workspace | undefined {
  return workspaces.find((w) => w.id === id)
}

export function getAllWorkspaces(): Workspace[] {
  return workspaces
}
