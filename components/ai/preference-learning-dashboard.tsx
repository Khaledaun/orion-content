"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Brain,
  Target,
  Lightbulb,
} from "lucide-react";
import { useToast } from "../ui/use-toast";

interface PreferenceLearningDashboardProps {
  siteId: string;
  userId: string;
}

interface UserPreferences {
  tone: string;
  length: string;
  structure: string;
  keywords: {
    primary: string[];
    secondary: string[];
    avoid: string[];
  };
  style: {
    useSubheadings: boolean;
    useBulletPoints: boolean;
    useImages: boolean;
    useCallToAction: boolean;
    paragraphLength: string;
  };
  seo: {
    keywordDensity: number;
    internalLinks: number;
    externalLinks: number;
    metaDescriptionLength: number;
    titleLength: number;
  };
}

interface LearningInsight {
  pattern: string;
  confidence: number;
  frequency: number;
  examples: string[];
  recommendation: string;
}

const PreferenceLearningDashboard: React.FC<
  PreferenceLearningDashboardProps
> = ({ siteId, userId }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [originalContent, setOriginalContent] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [userRating, setUserRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [personalizedContent, setPersonalizedContent] = useState("");
  const [baseContent, setBaseContent] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
    fetchInsights();
  }, [siteId, userId]);

  const fetchPreferences = async () => {
    try {
      const response = await fetch(
        `/api/ai/preferences?siteId=${siteId}&action=preferences`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.preferences) {
          setPreferences(data.preferences.contentStyle);
        }
      }
    } catch (error) {
      console.error("Failed to fetch preferences:", error);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await fetch(
        `/api/ai/preferences?siteId=${siteId}&action=insights`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInsights(data.insights);
        }
      }
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    }
  };

  const learnFromComparison = async () => {
    if (!originalContent || !editedContent) {
      toast({
        title: "Error",
        description: "Please provide both original and edited content",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          action: "learn_from_comparison",
          data: {
            original: originalContent,
            edited: editedContent,
            userRating,
            feedback,
            contentType: "blog",
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Success",
            description: "AI learned from your content comparison",
          });
          fetchPreferences();
          fetchInsights();
          setOriginalContent("");
          setEditedContent("");
          setUserRating(0);
          setFeedback("");
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to learn from comparison",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePersonalizedContent = async () => {
    if (!baseContent) {
      toast({
        title: "Error",
        description: "Please provide base content to personalize",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          action: "generate_personalized_content",
          data: {
            baseContent,
            contentType: "blog",
            keywords: ["seo", "content", "marketing"],
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPersonalizedContent(data.result.optimizedContent);
          toast({
            title: "Success",
            description: `Personalized content generated with ${data.result.confidence * 100}% confidence`,
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate personalized content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (
    newPreferences: Partial<UserPreferences>,
  ) => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          action: "update_preferences",
          data: {
            contentStyle: { ...preferences, ...newPreferences },
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPreferences(data.preferences.contentStyle);
          toast({
            title: "Success",
            description: "Preferences updated successfully",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Preference Learning Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="learning">Learning</TabsTrigger>
              <TabsTrigger value="personalization">Personalization</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Learning Confidence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {preferences ? "75%" : "0%"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Based on {preferences ? "15" : "0"} content samples
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Preferred Tone
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {preferences?.tone || "Not learned"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Most common writing style
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Content Structure
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {preferences?.structure || "Not learned"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Preferred content format
                    </p>
                  </CardContent>
                </Card>
              </div>

              {preferences && (
                <Card>
                  <CardHeader>
                    <CardTitle>Current Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tone</Label>
                        <Select
                          value={preferences.tone}
                          onValueChange={(value) =>
                            updatePreferences({ tone: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">
                              Professional
                            </SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="conversational">
                              Conversational
                            </SelectItem>
                            <SelectItem value="authoritative">
                              Authoritative
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Length</Label>
                        <Select
                          value={preferences.length}
                          onValueChange={(value) =>
                            updatePreferences({ length: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">Short</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="long">Long</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Structure</Label>
                        <Select
                          value={preferences.structure}
                          onValueChange={(value) =>
                            updatePreferences({ structure: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="list">List</SelectItem>
                            <SelectItem value="narrative">Narrative</SelectItem>
                            <SelectItem value="how-to">How-to</SelectItem>
                            <SelectItem value="comparison">
                              Comparison
                            </SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Paragraph Length</Label>
                        <Select
                          value={preferences.style.paragraphLength}
                          onValueChange={(value) =>
                            updatePreferences({
                              style: {
                                ...preferences.style,
                                paragraphLength: value,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">Short</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="long">Long</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="learning" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Teach AI Your Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="original">Original Content</Label>
                    <Textarea
                      id="original"
                      placeholder="Paste the original content here..."
                      value={originalContent}
                      onChange={(e) => setOriginalContent(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edited">Your Edited Version</Label>
                    <Textarea
                      id="edited"
                      placeholder="Paste your edited version here..."
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rating">Rating (1-5)</Label>
                      <Select
                        value={userRating.toString()}
                        onValueChange={(value) =>
                          setUserRating(parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select rating" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Poor</SelectItem>
                          <SelectItem value="2">2 - Fair</SelectItem>
                          <SelectItem value="3">3 - Good</SelectItem>
                          <SelectItem value="4">4 - Very Good</SelectItem>
                          <SelectItem value="5">5 - Excellent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="feedback">Feedback (Optional)</Label>
                      <Input
                        id="feedback"
                        placeholder="What did you change and why?"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button onClick={learnFromComparison} disabled={loading}>
                    {loading ? "Learning..." : "Teach AI"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="personalization" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Personalized Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="baseContent">Base Content</Label>
                    <Textarea
                      id="baseContent"
                      placeholder="Enter the base content to personalize..."
                      value={baseContent}
                      onChange={(e) => setBaseContent(e.target.value)}
                      rows={6}
                    />
                  </div>

                  <Button
                    onClick={generatePersonalizedContent}
                    disabled={loading}
                  >
                    {loading
                      ? "Generating..."
                      : "Generate Personalized Content"}
                  </Button>

                  {personalizedContent && (
                    <div>
                      <Label>Personalized Content</Label>
                      <Textarea
                        value={personalizedContent}
                        readOnly
                        rows={8}
                        className="mt-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Learning Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.length > 0 ? (
                    <div className="space-y-4">
                      {insights.map((insight, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{insight.pattern}</h4>
                            <Badge
                              variant={
                                insight.confidence >= 0.8
                                  ? "default"
                                  : insight.confidence >= 0.6
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {getConfidenceLabel(insight.confidence)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {insight.recommendation}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>Frequency: {insight.frequency} times</span>
                            <span>•</span>
                            <span>
                              Confidence:{" "}
                              {(insight.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No insights yet. Start teaching the AI by comparing
                        content in the Learning tab.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PreferenceLearningDashboard;
