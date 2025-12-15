import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold">Overview</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cloud Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">$--</p>
            <p className="text-sm text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              K8s Clusters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Running</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost by Provider</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Chart placeholder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Cost Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Chart placeholder</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
