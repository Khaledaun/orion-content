"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Link,
  Target,
  Users,
  Mail,
  ExternalLink,
} from "lucide-react";
import { useToast } from "../ui/use-toast";

interface BacklinkCampaignManagerProps {
  siteId: string;
  domain: string;
}

interface BacklinkOpportunity {
  domain: string;
  url: string;
  domainRating: number;
  traffic: number;
  relevance: number;
  contactInfo: {
    email?: string;
    socialMedia?: string[];
    contactPage?: string;
  };
  opportunityType:
    | "guest_post"
    | "resource_page"
    | "broken_link"
    | "competitor_gap"
    | "unlinked_mention";
  difficulty: "easy" | "medium" | "hard";
  estimatedValue: number;
  description: string;
  actionPlan: string[];
}

interface LinkBuildingCampaign {
  id: string;
  name: string;
  targetDomain: string;
  status: "planning" | "outreach" | "in_progress" | "completed" | "paused";
  progress: {
    total: number;
    contacted: number;
    responded: number;
    secured: number;
    rejected: number;
  };
  metrics: {
    responseRate: number;
    successRate: number;
    averageDomainRating: number;
    estimatedTrafficIncrease: number;
  };
  createdAt: string;
  updatedAt: string;
}

const BacklinkCampaignManager: React.FC<BacklinkCampaignManagerProps> = ({
  siteId,
  domain,
}) => {
  const [opportunities, setOpportunities] = useState<BacklinkOpportunity[]>([]);
  const [campaigns, setCampaigns] = useState<LinkBuildingCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("opportunities");
  const [newCampaignName, setNewCampaignName] = useState("");
  const [selectedOpportunities, setSelectedOpportunities] = useState<string[]>(
    [],
  );
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchOpportunities();
    fetchCampaigns();
  }, [siteId]);

  const fetchOpportunities = async () => {
    try {
      const response = await fetch("/api/seo/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          action: "find_opportunities",
          data: {
            domain,
            competitors,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOpportunities(data.opportunities);
        }
      }
    } catch (error) {
      console.error("Failed to fetch opportunities:", error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(
        `/api/seo/backlinks?siteId=${siteId}&action=campaigns`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCampaigns(data.campaigns);
        }
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    }
  };

  const createCampaign = async () => {
    if (!newCampaignName || selectedOpportunities.length === 0) {
      toast({
        title: "Error",
        description: "Please provide a campaign name and select opportunities",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const selectedOpps = opportunities.filter((opp) =>
        selectedOpportunities.includes(opp.domain),
      );

      const response = await fetch("/api/seo/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          action: "create_campaign",
          data: {
            name: newCampaignName,
            targetDomain: domain,
            opportunities: selectedOpps,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Success",
            description: "Link building campaign created successfully",
          });
          setNewCampaignName("");
          setSelectedOpportunities([]);
          fetchCampaigns();
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addCompetitor = () => {
    if (newCompetitor && !competitors.includes(newCompetitor)) {
      setCompetitors([...competitors, newCompetitor]);
      setNewCompetitor("");
    }
  };

  const removeCompetitor = (competitor: string) => {
    setCompetitors(competitors.filter((c) => c !== competitor));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "hard":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getOpportunityTypeIcon = (type: string) => {
    switch (type) {
      case "guest_post":
        return <Users className="h-4 w-4" />;
      case "resource_page":
        return <Link className="h-4 w-4" />;
      case "broken_link":
        return <AlertCircle className="h-4 w-4" />;
      case "competitor_gap":
        return <Target className="h-4 w-4" />;
      case "unlinked_mention":
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <Link className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "text-blue-600 bg-blue-100";
      case "outreach":
        return "text-yellow-600 bg-yellow-100";
      case "in_progress":
        return "text-green-600 bg-green-100";
      case "completed":
        return "text-gray-600 bg-gray-100";
      case "paused":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Backlink Campaign Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="setup">Setup</TabsTrigger>
            </TabsList>

            <TabsContent value="opportunities" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Link Building Opportunities
                </h3>
                <Button onClick={fetchOpportunities} disabled={loading}>
                  {loading ? "Finding..." : "Find Opportunities"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {opportunities.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Across all types
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Easy Wins
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {
                        opportunities.filter((opp) => opp.difficulty === "easy")
                          .length
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Low difficulty opportunities
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      High Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {
                        opportunities.filter((opp) => opp.estimatedValue >= 70)
                          .length
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      High estimated value
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                {opportunities.map((opportunity, index) => (
                  <Card key={index} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getOpportunityTypeIcon(opportunity.opportunityType)}
                          <h4 className="font-medium">{opportunity.domain}</h4>
                          <Badge
                            className={getDifficultyColor(
                              opportunity.difficulty,
                            )}
                          >
                            {opportunity.difficulty}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedOpportunities.includes(
                              opportunity.domain,
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOpportunities([
                                  ...selectedOpportunities,
                                  opportunity.domain,
                                ]);
                              } else {
                                setSelectedOpportunities(
                                  selectedOpportunities.filter(
                                    (d) => d !== opportunity.domain,
                                  ),
                                );
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-muted-foreground">
                            Select
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {opportunity.description}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Domain Rating
                          </Label>
                          <div className="font-medium">
                            {opportunity.domainRating}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Traffic
                          </Label>
                          <div className="font-medium">
                            {opportunity.traffic.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Relevance
                          </Label>
                          <div className="font-medium">
                            {(opportunity.relevance * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Value
                          </Label>
                          <div className="font-medium">
                            {opportunity.estimatedValue}/100
                          </div>
                        </div>
                      </div>

                      {opportunity.contactInfo.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4" />
                          <span>{opportunity.contactInfo.email}</span>
                        </div>
                      )}

                      <div className="mt-3">
                        <Label className="text-xs text-muted-foreground">
                          Action Plan
                        </Label>
                        <ul className="text-sm text-muted-foreground mt-1">
                          {opportunity.actionPlan
                            .slice(0, 2)
                            .map((action, actionIndex) => (
                              <li
                                key={actionIndex}
                                className="flex items-start gap-1"
                              >
                                <span className="text-blue-500 mt-1">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Link Building Campaigns
                </h3>
                <Button onClick={fetchCampaigns} disabled={loading}>
                  {loading ? "Loading..." : "Refresh"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Active Campaigns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {
                        campaigns.filter((c) => c.status === "in_progress")
                          .length
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Currently running
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Links Secured
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {campaigns.reduce(
                        (sum, c) => sum + c.progress.secured,
                        0,
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Across all campaigns
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avg Response Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {campaigns.length > 0
                        ? (
                            campaigns.reduce(
                              (sum, c) => sum + c.metrics.responseRate,
                              0,
                            ) / campaigns.length
                          ).toFixed(1)
                        : "0"}
                      %
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Email response rate
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Success Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {campaigns.length > 0
                        ? (
                            campaigns.reduce(
                              (sum, c) => sum + c.metrics.successRate,
                              0,
                            ) / campaigns.length
                          ).toFixed(1)
                        : "0"}
                      %
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Link acquisition rate
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {campaign.name}
                        </CardTitle>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Total Opportunities
                          </Label>
                          <div className="font-medium">
                            {campaign.progress.total}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Contacted
                          </Label>
                          <div className="font-medium">
                            {campaign.progress.contacted}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Responded
                          </Label>
                          <div className="font-medium">
                            {campaign.progress.responded}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Secured
                          </Label>
                          <div className="font-medium text-green-600">
                            {campaign.progress.secured}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>
                            {Math.round(
                              (campaign.progress.contacted /
                                campaign.progress.total) *
                                100,
                            )}
                            %
                          </span>
                        </div>
                        <Progress
                          value={
                            (campaign.progress.contacted /
                              campaign.progress.total) *
                            100
                          }
                          className="h-2"
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Response Rate
                          </Label>
                          <div className="font-medium">
                            {campaign.metrics.responseRate.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Success Rate
                          </Label>
                          <div className="font-medium">
                            {campaign.metrics.successRate.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Avg Domain Rating
                          </Label>
                          <div className="font-medium">
                            {campaign.metrics.averageDomainRating}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="setup" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Campaign</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="campaignName">Campaign Name</Label>
                    <Input
                      id="campaignName"
                      placeholder="Enter campaign name..."
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Competitors (for gap analysis)</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Enter competitor domain..."
                        value={newCompetitor}
                        onChange={(e) => setNewCompetitor(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addCompetitor()}
                      />
                      <Button onClick={addCompetitor} variant="outline">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {competitors.map((competitor) => (
                        <Badge
                          key={competitor}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {competitor}
                          <button
                            onClick={() => removeCompetitor(competitor)}
                            className="ml-1 hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>
                      Selected Opportunities ({selectedOpportunities.length})
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      {selectedOpportunities.length > 0
                        ? `Selected ${selectedOpportunities.length} opportunities for this campaign`
                        : "No opportunities selected. Go to the Opportunities tab to select some."}
                    </div>
                  </div>

                  <Button
                    onClick={createCampaign}
                    disabled={
                      loading ||
                      !newCampaignName ||
                      selectedOpportunities.length === 0
                    }
                    className="w-full"
                  >
                    {loading ? "Creating Campaign..." : "Create Campaign"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default BacklinkCampaignManager;
