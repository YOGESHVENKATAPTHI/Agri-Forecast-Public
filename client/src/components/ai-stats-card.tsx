import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Cpu, Key, Activity } from "lucide-react";

export function AIStatsCard() {
  const { data: aiStats, isLoading } = useQuery({
    queryKey: ["/api/ai-stats"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            AI System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading stats...</div>
        </CardContent>
      </Card>
    );
  }

  if (!aiStats?.success) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            AI System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">Unable to load AI stats</div>
        </CardContent>
      </Card>
    );
  }

  const stats = aiStats.stats;
  const healthyKeys = stats.apiKeysStatus?.filter((key: any) => !key.blocked).length || 0;
  const totalKeys = stats.apiKeysStatus?.length || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          AI System Status
        </CardTitle>
        <CardDescription className="text-xs">
          Real-time AI performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* System Health */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-green-500" />
            <span className="text-xs font-medium">System Health</span>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-600">
            {stats.systemHealth || "Operational"}
          </Badge>
        </div>

        {/* Available Models */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-3 h-3 text-blue-500" />
            <span className="text-xs font-medium">AI Models</span>
          </div>
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            {stats.availableModels || 0}
          </Badge>
        </div>

        {/* API Keys Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Key className="w-3 h-3 text-purple-500" />
            <span className="text-xs font-medium">API Keys</span>
            <Badge variant="outline" className="text-xs">
              {healthyKeys}/{totalKeys}
            </Badge>
          </div>
          {totalKeys > 0 && (
            <div className="space-y-1">
              <Progress 
                value={(healthyKeys / totalKeys) * 100} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {healthyKeys} healthy, {totalKeys - healthyKeys} rate-limited
              </div>
            </div>
          )}
        </div>

        {/* Recent Performance */}
        {stats.apiKeysStatus && stats.apiKeysStatus.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium">Recent Performance</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-green-600">Successful: </span>
                {stats.apiKeysStatus.reduce((sum: number, key: any) => sum + key.successes, 0)}
              </div>
              <div>
                <span className="text-red-600">Failures: </span>
                {stats.apiKeysStatus.reduce((sum: number, key: any) => sum + key.failures, 0)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}