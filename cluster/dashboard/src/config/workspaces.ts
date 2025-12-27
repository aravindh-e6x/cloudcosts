export interface Workspace {
  id: string
  name: string
  database: string
  region?: string
}

export const workspaces: Workspace[] = [
  {
    id: "k3d-cloudcosts",
    name: "K3D CloudCosts",
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
