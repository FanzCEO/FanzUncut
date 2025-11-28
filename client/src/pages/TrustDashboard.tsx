import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Shield, Award, FileCheck, AlertTriangle, Upload, CheckCircle, XCircle, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TrustScore, TrustProof, DisputeCase } from "@shared/schema";

// Trust tier colors and icons
const TIER_CONFIG = {
  unverified: { color: "bg-gray-500", label: "Unverified", icon: Shield },
  bronze: { color: "bg-amber-600", label: "Bronze", icon: Shield },
  silver: { color: "bg-gray-400", label: "Silver", icon: Shield },
  gold: { color: "bg-yellow-500", label: "Gold", icon: Award },
  platinum: { color: "bg-blue-500", label: "Platinum", icon: Award },
  diamond: { color: "bg-purple-600", label: "Diamond", icon: Award },
};

const PROOF_STATUS_CONFIG = {
  pending: { color: "bg-yellow-500", label: "Pending Review", icon: Clock },
  under_review: { color: "bg-blue-500", label: "Under Review", icon: FileCheck },
  approved: { color: "bg-green-500", label: "Approved", icon: CheckCircle },
  rejected: { color: "bg-red-500", label: "Rejected", icon: XCircle },
  expired: { color: "bg-gray-500", label: "Expired", icon: Clock },
};

export default function TrustDashboard() {
  const { toast } = useToast();
  const [selectedProofType, setSelectedProofType] = useState("");
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [disputeTitle, setDisputeTitle] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeType, setDisputeType] = useState("");

  // Fetch trust score
  const { data: trustScore, isLoading: scoreLoading } = useQuery<TrustScore>({
    queryKey: ["/api/trust/score"],
  });

  // Fetch user's proofs
  const { data: proofs, isLoading: proofsLoading } = useQuery<TrustProof[]>({
    queryKey: ["/api/trust/proofs"],
  });

  // Fetch user's disputes
  const { data: disputes, isLoading: disputesLoading } = useQuery<DisputeCase[]>({
    queryKey: ["/api/trust/disputes"],
  });

  // Submit proof mutation
  const submitProofMutation = useMutation({
    mutationFn: async (data: any) =>
      apiRequest("/api/trust/proofs", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "Proof submitted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/trust/proofs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trust/score"] });
      setSelectedProofType("");
      setDocumentUrls([]);
    },
    onError: () => {
      toast({ title: "Failed to submit proof", variant: "destructive" });
    },
  });

  // File dispute mutation
  const fileDisputeMutation = useMutation({
    mutationFn: async (data: any) =>
      apiRequest("/api/trust/disputes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "Dispute filed successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/trust/disputes"] });
      setDisputeTitle("");
      setDisputeDescription("");
      setDisputeType("");
    },
    onError: () => {
      toast({ title: "Failed to file dispute", variant: "destructive" });
    },
  });

  const handleSubmitProof = () => {
    if (!selectedProofType || documentUrls.length === 0) {
      toast({ title: "Please select proof type and upload documents", variant: "destructive" });
      return;
    }

    submitProofMutation.mutate({
      proofType: selectedProofType,
      documentUrls,
      metadata: {},
    });
  };

  const handleFileDispute = () => {
    if (!disputeTitle || !disputeDescription || !disputeType) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    fileDisputeMutation.mutate({
      title: disputeTitle,
      description: disputeDescription,
      disputeType,
      evidenceUrls: [],
      relatedTransactionIds: [],
      relatedContentIds: [],
    });
  };

  const tierConfig = trustScore?.currentTier ? TIER_CONFIG[trustScore.currentTier as keyof typeof TIER_CONFIG] : TIER_CONFIG.unverified;
  const TierIcon = tierConfig.icon;

  const getNextTier = (currentScore: number) => {
    if (currentScore < 100) return { tier: "Bronze", points: 100 };
    if (currentScore < 500) return { tier: "Silver", points: 500 };
    if (currentScore < 1500) return { tier: "Gold", points: 1500 };
    if (currentScore < 5000) return { tier: "Platinum", points: 5000 };
    if (currentScore < 10000) return { tier: "Diamond", points: 10000 };
    return { tier: "Diamond (Max)", points: 10000 };
  };

  const nextTier = trustScore ? getNextTier(trustScore.scorePoints) : { tier: "Bronze", points: 100 };
  const progressToNextTier = trustScore
    ? Math.min(100, (trustScore.scorePoints / nextTier.points) * 100)
    : 0;

  if (scoreLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bebas-neue tracking-wider mb-2">
            FANZTRUST™ REPUTATION SYSTEM
          </h1>
          <p className="text-gray-400">Build trust. Unlock privileges. Protect the community.</p>
        </div>

        {/* Trust Score Overview */}
        <Card className="bg-black/40 border-red-900/20 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-full ${tierConfig.color}`}>
                  <TierIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bebas-neue tracking-wider">
                    {tierConfig.label} TIER
                  </CardTitle>
                  <CardDescription className="text-lg">
                    {trustScore?.scorePoints || 0} Trust Points
                  </CardDescription>
                </div>
              </div>
              <Badge className={`${tierConfig.color} text-white px-4 py-2 text-lg`} data-testid="badge-tier">
                {tierConfig.label.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-400">Progress to {nextTier.tier}</span>
                <span className="text-sm text-gray-400">
                  {trustScore?.scorePoints || 0} / {nextTier.points}
                </span>
              </div>
              <Progress value={progressToNextTier} className="h-2" />
            </div>

            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-400">Proofs Approved</p>
                <p className="text-2xl font-bold text-green-500" data-testid="text-proofs-approved">
                  {trustScore?.proofsApproved || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Transactions</p>
                <p className="text-2xl font-bold text-blue-500" data-testid="text-transactions">
                  {trustScore?.transactionCount || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Disputes Won</p>
                <p className="text-2xl font-bold text-yellow-500" data-testid="text-disputes-won">
                  {trustScore?.successfulDisputesWon || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Account Age</p>
                <p className="text-2xl font-bold text-purple-500" data-testid="text-account-age">
                  {trustScore?.accountAgeDays || 0}d
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Proofs and Disputes */}
        <Tabs defaultValue="proofs" className="space-y-6">
          <TabsList className="bg-black/40 border border-red-900/20" data-testid="tabs-list">
            <TabsTrigger value="proofs" data-testid="tab-proofs">Trust Proofs</TabsTrigger>
            <TabsTrigger value="disputes" data-testid="tab-disputes">Disputes</TabsTrigger>
          </TabsList>

          {/* Trust Proofs Tab */}
          <TabsContent value="proofs" className="space-y-6">
            {/* Submit New Proof */}
            <Card className="bg-black/40 border-red-900/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Submit Trust Proof
                </CardTitle>
                <CardDescription>
                  Verify your identity and increase your trust score
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="proof-type">Proof Type</Label>
                    <Select value={selectedProofType} onValueChange={setSelectedProofType}>
                      <SelectTrigger data-testid="select-proof-type">
                        <SelectValue placeholder="Select proof type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id_verification">ID Verification (+200 pts)</SelectItem>
                        <SelectItem value="address_verification">Address Verification (+150 pts)</SelectItem>
                        <SelectItem value="payment_history">Payment History (+100 pts)</SelectItem>
                        <SelectItem value="social_media">Social Media (+50 pts)</SelectItem>
                        <SelectItem value="employment">Employment Verification (+100 pts)</SelectItem>
                        <SelectItem value="bank_statement">Bank Statement (+150 pts)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="document-url">Document URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="document-url"
                        placeholder="https://example.com/document.pdf"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            const input = e.target as HTMLInputElement;
                            if (input.value) {
                              setDocumentUrls([...documentUrls, input.value]);
                              input.value = "";
                            }
                          }
                        }}
                        data-testid="input-document-url"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          const input = document.getElementById("document-url") as HTMLInputElement;
                          if (input.value) {
                            setDocumentUrls([...documentUrls, input.value]);
                            input.value = "";
                          }
                        }}
                        data-testid="button-add-document"
                      >
                        Add
                      </Button>
                    </div>
                    {documentUrls.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {documentUrls.map((url, index) => (
                          <div key={index} className="text-sm text-gray-400 flex items-center justify-between">
                            <span className="truncate">{url}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDocumentUrls(documentUrls.filter((_, i) => i !== index))}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSubmitProof}
                    disabled={submitProofMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                    data-testid="button-submit-proof"
                  >
                    {submitProofMutation.isPending ? "Submitting..." : "Submit Proof"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Submitted Proofs */}
            <Card className="bg-black/40 border-red-900/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>My Submitted Proofs</CardTitle>
              </CardHeader>
              <CardContent>
                {proofsLoading ? (
                  <p>Loading proofs...</p>
                ) : proofs && proofs.length > 0 ? (
                  <div className="space-y-4">
                    {proofs.map((proof: any) => {
                      const statusConfig = PROOF_STATUS_CONFIG[proof.status as keyof typeof PROOF_STATUS_CONFIG];
                      const StatusIcon = statusConfig.icon;
                      return (
                        <div
                          key={proof.id}
                          className="p-4 bg-black/20 rounded-lg border border-gray-800"
                          data-testid={`proof-${proof.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${statusConfig.color}`}>
                                <StatusIcon className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="font-semibold capitalize">
                                  {proof.proofType.replace(/_/g, " ")}
                                </p>
                                <p className="text-sm text-gray-400">
                                  Submitted {new Date(proof.submittedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge className={`${statusConfig.color} text-white`}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          {proof.status === "approved" && proof.scorePointsAwarded > 0 && (
                            <p className="mt-2 text-sm text-green-400">
                              +{proof.scorePointsAwarded} Trust Points
                            </p>
                          )}
                          {proof.status === "rejected" && proof.rejectionReason && (
                            <p className="mt-2 text-sm text-red-400">
                              Reason: {proof.rejectionReason}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400">No proofs submitted yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes" className="space-y-6">
            {/* File New Dispute */}
            <Card className="bg-black/40 border-red-900/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  File a Dispute
                </CardTitle>
                <CardDescription>
                  Report issues and seek resolution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="dispute-type">Dispute Type</Label>
                  <Select value={disputeType} onValueChange={setDisputeType}>
                    <SelectTrigger data-testid="select-dispute-type">
                      <SelectValue placeholder="Select dispute type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transaction">Transaction Issue</SelectItem>
                      <SelectItem value="content">Content Violation</SelectItem>
                      <SelectItem value="harassment">Harassment</SelectItem>
                      <SelectItem value="fraud">Fraud</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dispute-title">Title</Label>
                  <Input
                    id="dispute-title"
                    value={disputeTitle}
                    onChange={(e) => setDisputeTitle(e.target.value)}
                    placeholder="Brief description of the issue"
                    data-testid="input-dispute-title"
                  />
                </div>

                <div>
                  <Label htmlFor="dispute-description">Description</Label>
                  <Textarea
                    id="dispute-description"
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    placeholder="Detailed explanation of the dispute"
                    rows={5}
                    data-testid="textarea-dispute-description"
                  />
                </div>

                <Button
                  onClick={handleFileDispute}
                  disabled={fileDisputeMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="button-file-dispute"
                >
                  {fileDisputeMutation.isPending ? "Filing..." : "File Dispute"}
                </Button>
              </CardContent>
            </Card>

            {/* Filed Disputes */}
            <Card className="bg-black/40 border-red-900/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>My Disputes</CardTitle>
              </CardHeader>
              <CardContent>
                {disputesLoading ? (
                  <p>Loading disputes...</p>
                ) : disputes && disputes.length > 0 ? (
                  <div className="space-y-4">
                    {disputes.map((dispute: any) => (
                      <div
                        key={dispute.id}
                        className="p-4 bg-black/20 rounded-lg border border-gray-800"
                        data-testid={`dispute-${dispute.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{dispute.title}</h3>
                          <Badge className={dispute.status === "resolved" ? "bg-green-500" : "bg-yellow-500"}>
                            {dispute.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{dispute.description}</p>
                        <p className="text-xs text-gray-500">
                          Filed {new Date(dispute.filedAt).toLocaleDateString()}
                        </p>
                        {dispute.resolution && (
                          <div className="mt-3 p-3 bg-green-900/20 border border-green-800 rounded">
                            <p className="text-sm font-semibold text-green-400">Resolution:</p>
                            <p className="text-sm text-gray-300">{dispute.resolution}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No disputes filed</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
