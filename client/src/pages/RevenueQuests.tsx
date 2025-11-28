import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Trophy, Users, Zap, Target, Gift, Plus, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

export default function RevenueQuests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [contributeDialogOpen, setContributeDialogOpen] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<any>(null);

  // Fetch active quests
  const { data: activeQuests = [] } = useQuery<any[]>({
    queryKey: ["/api/revenue-quests/quests/active"],
  });

  // Fetch my quests (creator)
  const { data: myQuests = [] } = useQuery<any[]>({
    queryKey: ["/api/revenue-quests/quests/my-quests"],
    enabled: user?.role === "creator",
  });

  // Fetch my participation (fan)
  const { data: myParticipation = [] } = useQuery<any[]>({
    queryKey: ["/api/revenue-quests/quests/my-participation"],
  });

  const [questForm, setQuestForm] = useState({
    title: "",
    description: "",
    questType: "revenue_goal",
    goalAmountCents: "",
    minContributionCents: "100",
    contributorSharePercentage: "10",
    rewardType: "exclusive_content",
    startDate: "",
    endDate: "",
  });

  const [contributeAmount, setContributeAmount] = useState("");

  // Create quest mutation
  const createQuestMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/revenue-quests/quests", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Quest Created!",
        description: "Your revenue quest has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/revenue-quests"] });
      setCreateDialogOpen(false);
      setQuestForm({
        title: "",
        description: "",
        questType: "revenue_goal",
        goalAmountCents: "",
        minContributionCents: "100",
        contributorSharePercentage: "10",
        rewardType: "exclusive_content",
        startDate: "",
        endDate: "",
      });
    },
  });

  // Contribute mutation
  const contributeMutation = useMutation({
    mutationFn: async ({ questId, amountCents }: { questId: string; amountCents: number }) => {
      return apiRequest(`/api/revenue-quests/quests/${questId}/contribute`, "POST", { amountCents });
    },
    onSuccess: () => {
      toast({
        title: "Contribution Successful!",
        description: "Your contribution has been added to the quest",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/revenue-quests"] });
      setContributeDialogOpen(false);
      setContributeAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Contribution Failed",
        description: error.message || "Failed to contribute to quest",
        variant: "destructive",
      });
    },
  });

  const handleCreateQuest = () => {
    const data: any = {
      title: questForm.title,
      description: questForm.description,
      questType: questForm.questType,
      goalAmountCents: Math.round(parseFloat(questForm.goalAmountCents) * 100),
      minContributionCents: parseInt(questForm.minContributionCents),
      contributorSharePercentage: parseInt(questForm.contributorSharePercentage),
      rewardType: questForm.rewardType,
      status: "active",
    };
    
    // Only include dates if they're set
    if (questForm.startDate) {
      data.startDate = new Date(questForm.startDate);
    }
    if (questForm.endDate) {
      data.endDate = new Date(questForm.endDate);
    }
    
    createQuestMutation.mutate(data);
  };

  const handleContribute = () => {
    if (!selectedQuest || !contributeAmount) return;
    const amountCents = Math.round(parseFloat(contributeAmount) * 100);
    contributeMutation.mutate({ questId: selectedQuest.id, amountCents });
  };

  const openContributeDialog = (quest: any) => {
    setSelectedQuest(quest);
    setContributeDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#050505] p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-['Bebas_Neue'] text-white mb-2 tracking-wide flex items-center gap-3">
                <Target className="h-10 w-10 text-[#ff0000]" />
                Revenue Quests
              </h1>
              <p className="text-zinc-400 text-lg">
                AI-powered gamified revenue goals. Support creators, unlock rewards, earn together.
              </p>
            </div>
            {user?.role === "creator" && (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#ff0000] hover:bg-[#cc0000]" data-testid="button-create-quest">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Quest
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-['Bebas_Neue']">Create Revenue Quest</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                      Set up a gamified revenue goal with fan participation and rewards
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Quest Title</Label>
                      <Input
                        value={questForm.title}
                        onChange={(e) => setQuestForm({ ...questForm, title: e.target.value })}
                        placeholder="e.g., New Album Production Fund"
                        className="bg-zinc-800 border-zinc-700"
                        data-testid="input-quest-title"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={questForm.description}
                        onChange={(e) => setQuestForm({ ...questForm, description: e.target.value })}
                        placeholder="Describe your quest and what fans will unlock..."
                        className="bg-zinc-800 border-zinc-700"
                        data-testid="input-quest-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Goal Amount ($)</Label>
                        <Input
                          type="number"
                          value={questForm.goalAmountCents}
                          onChange={(e) => setQuestForm({ ...questForm, goalAmountCents: e.target.value })}
                          placeholder="1000"
                          className="bg-zinc-800 border-zinc-700"
                          data-testid="input-quest-goal"
                        />
                      </div>
                      <div>
                        <Label>Quest Type</Label>
                        <Select value={questForm.questType} onValueChange={(value) => setQuestForm({ ...questForm, questType: value })}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700" data-testid="select-quest-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800">
                            <SelectItem value="revenue_goal">Revenue Goal</SelectItem>
                            <SelectItem value="fan_contribution">Fan Contribution</SelectItem>
                            <SelectItem value="content_unlock">Content Unlock</SelectItem>
                            <SelectItem value="collaborative_project">Collaborative Project</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Contributor Share (%)</Label>
                        <Input
                          type="number"
                          value={questForm.contributorSharePercentage}
                          onChange={(e) => setQuestForm({ ...questForm, contributorSharePercentage: e.target.value })}
                          placeholder="10"
                          className="bg-zinc-800 border-zinc-700"
                          data-testid="input-contributor-share"
                        />
                      </div>
                      <div>
                        <Label>Reward Type</Label>
                        <Select value={questForm.rewardType} onValueChange={(value) => setQuestForm({ ...questForm, rewardType: value })}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700" data-testid="select-reward-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800">
                            <SelectItem value="exclusive_content">Exclusive Content</SelectItem>
                            <SelectItem value="nft">NFT</SelectItem>
                            <SelectItem value="experience">Experience</SelectItem>
                            <SelectItem value="exclusive_access">Exclusive Access</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={questForm.startDate}
                          onChange={(e) => setQuestForm({ ...questForm, startDate: e.target.value })}
                          className="bg-zinc-800 border-zinc-700"
                          data-testid="input-start-date"
                        />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={questForm.endDate}
                          onChange={(e) => setQuestForm({ ...questForm, endDate: e.target.value })}
                          className="bg-zinc-800 border-zinc-700"
                          data-testid="input-end-date"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleCreateQuest}
                      disabled={createQuestMutation.isPending}
                      className="w-full bg-[#ff0000] hover:bg-[#cc0000]"
                      data-testid="button-submit-quest"
                    >
                      {createQuestMutation.isPending ? "Creating..." : "Create Quest"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="discover" className="w-full">
          <TabsList className="bg-zinc-900 border-b border-zinc-800 w-full justify-start">
            <TabsTrigger value="discover" className="data-[state=active]:bg-zinc-800" data-testid="tab-discover">
              <Sparkles className="mr-2 h-4 w-4" />
              Discover
            </TabsTrigger>
            {user?.role === "creator" && (
              <TabsTrigger value="my-quests" className="data-[state=active]:bg-zinc-800" data-testid="tab-my-quests">
                <Trophy className="mr-2 h-4 w-4" />
                My Quests
              </TabsTrigger>
            )}
            <TabsTrigger value="participation" className="data-[state=active]:bg-zinc-800" data-testid="tab-participation">
              <Users className="mr-2 h-4 w-4" />
              My Contributions
            </TabsTrigger>
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeQuests.map((quest: any) => (
                <Card key={quest.id} className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm" data-testid={`quest-card-${quest.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl text-white">{quest.title}</CardTitle>
                        <CardDescription className="text-zinc-400">{quest.description}</CardDescription>
                      </div>
                      <Badge className="bg-[#ff0000]/20 text-[#ff0000] border-[#ff0000]/30">
                        {quest.questType.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-zinc-400">Progress</span>
                          <span className="text-[#d4a959] font-semibold">{quest.completionPercentage}%</span>
                        </div>
                        <Progress value={quest.completionPercentage} className="h-2 bg-zinc-800" />
                        <div className="flex justify-between text-sm mt-2">
                          <span className="text-white">{formatCurrency(quest.currentAmountCents || 0)}</span>
                          <span className="text-zinc-400">{formatCurrency(quest.goalAmountCents)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-zinc-400">
                          <Users className="h-4 w-4" />
                          <span>{quest.totalContributors}</span>
                        </div>
                        {quest.contributorSharePercentage > 0 && (
                          <div className="flex items-center gap-1 text-[#d4a959]">
                            <TrendingUp className="h-4 w-4" />
                            <span>{quest.contributorSharePercentage}% share</span>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => openContributeDialog(quest)}
                        className="w-full bg-[#d4a959] hover:bg-[#b8925e]"
                        data-testid={`button-contribute-${quest.id}`}
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        Contribute Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* My Quests Tab (Creator only) */}
          {user?.role === "creator" && (
            <TabsContent value="my-quests" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myQuests.map((quest: any) => (
                  <Card key={quest.id} className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl text-white">{quest.title}</CardTitle>
                        <Badge className={
                          quest.status === "completed" ? "bg-green-500/20 text-green-500" :
                          quest.status === "active" ? "bg-[#ff0000]/20 text-[#ff0000]" :
                          "bg-zinc-700 text-zinc-400"
                        }>
                          {quest.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Progress value={quest.completionPercentage} className="h-2 bg-zinc-800" />
                          <div className="flex justify-between text-sm mt-2">
                            <span className="text-white">{formatCurrency(quest.currentAmountCents || 0)}</span>
                            <span className="text-zinc-400">{formatCurrency(quest.goalAmountCents)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-zinc-400">
                            <Users className="h-4 w-4" />
                            <span>{quest.totalContributors} contributors</span>
                          </div>
                          {quest.status === "completed" && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          {/* My Participation Tab */}
          <TabsContent value="participation" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myParticipation.map((participation: any) => (
                <Card key={participation.id} className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Quest Contribution</h3>
                        {participation.isUnderwriter && (
                          <Badge className="bg-[#d4a959]/20 text-[#d4a959] border-[#d4a959]/30">
                            <Trophy className="h-3 w-3 mr-1" />
                            Early Supporter
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-zinc-400">Contributed</span>
                          <p className="text-white font-semibold">{formatCurrency(participation.contributedAmountCents)}</p>
                        </div>
                        <div>
                          <span className="text-zinc-400">Earned</span>
                          <p className="text-[#d4a959] font-semibold">{formatCurrency(participation.earnedAmountCents || 0)}</p>
                        </div>
                      </div>

                      <div className="text-sm">
                        <span className="text-zinc-400">Your Share: </span>
                        <span className="text-[#d4a959] font-semibold">{parseFloat(participation.sharePercentage || "0").toFixed(2)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Contribute Dialog */}
        <Dialog open={contributeDialogOpen} onOpenChange={setContributeDialogOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-['Bebas_Neue']">Contribute to Quest</DialogTitle>
              <DialogDescription className="text-zinc-400">
                {selectedQuest?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Contribution Amount ($)</Label>
                <Input
                  type="number"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  placeholder="10.00"
                  step="0.01"
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-contribute-amount"
                />
                {selectedQuest && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Minimum: {formatCurrency(selectedQuest.minContributionCents || 100)}
                  </p>
                )}
              </div>

              {selectedQuest?.contributorSharePercentage > 0 && (
                <div className="p-4 rounded-lg bg-[#d4a959]/10 border border-[#d4a959]/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="h-5 w-5 text-[#d4a959]" />
                    <span className="text-[#d4a959] font-semibold">Earn Rewards!</span>
                  </div>
                  <p className="text-sm text-zinc-400">
                    Contributors earn {selectedQuest.contributorSharePercentage}% of quest revenue when completed.
                    Early supporters get bonus rewards!
                  </p>
                </div>
              )}

              <Button
                onClick={handleContribute}
                disabled={contributeMutation.isPending || !contributeAmount}
                className="w-full bg-[#d4a959] hover:bg-[#b8925e]"
                data-testid="button-confirm-contribute"
              >
                {contributeMutation.isPending ? "Contributing..." : "Confirm Contribution"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
