"use client";

import React, { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lightbulb,
  TrendingUp,
  Users,
  Search,
  Award,
  Zap,
  CheckCircle,
  Clock,
  BarChart3,
  Sparkles,
  Target,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Trash2,
} from "lucide-react";

interface TopicData {
  id: string;
  title: string;
  angle: string;
  niche: string;
  searchVolume: number;
  difficulty: "Easy" | "Medium" | "Hard";
  qualityScore: number;
  engagementPrediction: number;
  status: "pending" | "approved" | "rejected" | "in-review";
  aiGenerated: boolean;
  abTestVariant?: "A" | "B";
  createdAt: Date;
  tags: string[];
}

interface TopicWorkflowProps {
  initialTopics?: TopicData[];
  onTopicsChange?: (topics: TopicData[]) => void;
  maxTopics?: number;
}

const sampleTopics: TopicData[] = [
  {
    id: "1",
    title: "Best Sustainable Phone Cases for 2024",
    angle: "Eco-friendly protection that doesn't compromise on style",
    niche: "Sustainable Living",
    searchVolume: 2400,
    difficulty: "Medium",
    qualityScore: 92,
    engagementPrediction: 87,
    status: "approved",
    aiGenerated: true,
    abTestVariant: "A",
    createdAt: new Date("2024-01-15"),
    tags: ["eco-friendly", "phone-accessories", "reviews"],
  },
  {
    id: "2",
    title: "Remote Work Productivity: 15 Tools That Actually Work",
    angle: "Tested by 100+ remote workers - real results only",
    niche: "Remote Work Tools",
    searchVolume: 3200,
    difficulty: "Easy",
    qualityScore: 88,
    engagementPrediction: 91,
    status: "pending",
    aiGenerated: true,
    abTestVariant: "B",
    createdAt: new Date("2024-01-16"),
    tags: ["productivity", "remote-work", "tools"],
  },
  {
    id: "3",
    title: "MacBook Pro M3 vs M2: The Honest Comparison",
    angle: "Skip the marketing fluff - here's what really matters",
    niche: "Tech Reviews",
    searchVolume: 8900,
    difficulty: "Hard",
    qualityScore: 95,
    engagementPrediction: 94,
    status: "in-review",
    aiGenerated: false,
    createdAt: new Date("2024-01-17"),
    tags: ["apple", "laptop", "comparison"],
  },
];

export function TopicWorkflow({
  initialTopics = sampleTopics,
  onTopicsChange,
  maxTopics = 30,
}: TopicWorkflowProps) {
  const [topics, setTopics] = useState<TopicData[]>(initialTopics);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState<string>("all");
  const [showABTest, setShowABTest] = useState(false);

  const generateTopics = async () => {
    setIsGenerating(true);

    // Simulate AI topic generation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const newTopics: TopicData[] = [
      {
        id: Date.now().toString(),
        title: "Zero Waste Kitchen: 20 Simple Swaps That Save Money",
        angle: "Reduce waste AND your grocery bill with these proven swaps",
        niche: "Sustainable Living",
        searchVolume: 1800,
        difficulty: "Easy",
        qualityScore: 89,
        engagementPrediction: 85,
        status: "pending",
        aiGenerated: true,
        createdAt: new Date(),
        tags: ["zero-waste", "kitchen", "money-saving"],
      },
      {
        id: (Date.now() + 1).toString(),
        title: "AI Writing Tools: Which Ones Actually Help Content Creators?",
        angle: "Tested 12 AI tools so you don't have to - surprising results",
        niche: "Tech Reviews",
        searchVolume: 4200,
        difficulty: "Medium",
        qualityScore: 91,
        engagementPrediction: 88,
        status: "pending",
        aiGenerated: true,
        createdAt: new Date(),
        tags: ["ai-tools", "content-creation", "productivity"],
      },
    ];

    const updatedTopics = [...topics, ...newTopics];
    setTopics(updatedTopics);
    onTopicsChange?.(updatedTopics);
    setIsGenerating(false);
  };

  const updateTopicStatus = (id: string, status: TopicData["status"]) => {
    const updatedTopics = topics.map((topic) =>
      topic.id === id ? { ...topic, status } : topic,
    );
    setTopics(updatedTopics);
    onTopicsChange?.(updatedTopics);
  };

  const deleteTopic = (id: string) => {
    const updatedTopics = topics.filter((topic) => topic.id !== id);
    setTopics(updatedTopics);
    onTopicsChange?.(updatedTopics);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "in-review":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-600 bg-green-100";
      case "Medium":
        return "text-yellow-600 bg-yellow-100";
      case "Hard":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const filteredTopics =
    selectedNiche === "all"
      ? topics
      : topics.filter((topic) => topic.niche === selectedNiche);

  const approvedCount = topics.filter((t) => t.status === "approved").length;
  const pendingCount = topics.filter((t) => t.status === "pending").length;
  const avgQualityScore = Math.round(
    topics.reduce((sum, t) => sum + t.qualityScore, 0) / topics.length,
  );

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="h-8 w-8 text-yellow-600" />
            Topic Generation Workflow
            <Badge variant="secondary" className="ml-2">
              <Target className="h-4 w-4 mr-1" />
              {approvedCount}/{maxTopics} Topics
            </Badge>
          </h2>
          <p className="text-gray-600 mt-1">
            AI-powered topic generation with playful A/B testing. Let's create
            content that converts! 🎯
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowABTest(!showABTest)}
            variant="outline"
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            A/B Test View
          </Button>
          <Button
            onClick={generateTopics}
            disabled={isGenerating || topics.length >= maxTopics}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          >
            {isGenerating ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Topics
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Approved Topics
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {approvedCount}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Review
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {pendingCount}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Quality Score
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {avgQualityScore}%
                </p>
              </div>
              <Award className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Progress</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round((approvedCount / maxTopics) * 100)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">
                Topic Generation Progress
              </Label>
              <span className="text-sm text-gray-600">
                {approvedCount} / {maxTopics} topics approved
              </span>
            </div>
            <Progress
              value={(approvedCount / maxTopics) * 100}
              className="h-3"
            />
            <p className="text-xs text-gray-500">
              {maxTopics - approvedCount} more topics needed to complete your
              content calendar
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <Tabs value={selectedNiche} onValueChange={setSelectedNiche}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Topics ({topics.length})</TabsTrigger>
          <TabsTrigger value="Tech Reviews">Tech Reviews</TabsTrigger>
          <TabsTrigger value="Sustainable Living">Sustainable</TabsTrigger>
          <TabsTrigger value="Remote Work Tools">Remote Work</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedNiche} className="mt-6">
          <div className="space-y-4">
            {filteredTopics.map((topic) => (
              <Card
                key={topic.id}
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {topic.title}
                        </h3>
                        {topic.aiGenerated && (
                          <Badge
                            variant="secondary"
                            className="bg-purple-100 text-purple-800"
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                        {topic.abTestVariant && (
                          <Badge
                            variant="outline"
                            className="border-blue-200 text-blue-700"
                          >
                            Variant {topic.abTestVariant}
                          </Badge>
                        )}
                        <Badge className={getStatusColor(topic.status)}>
                          {topic.status.charAt(0).toUpperCase() +
                            topic.status.slice(1)}
                        </Badge>
                      </div>

                      <p className="text-gray-600 mb-3 italic">
                        "{topic.angle}"
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div>
                          <Label className="text-xs text-gray-500">Niche</Label>
                          <p className="font-medium text-sm">{topic.niche}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">
                            Search Volume
                          </Label>
                          <p className="font-medium text-sm">
                            {topic.searchVolume.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">
                            Difficulty
                          </Label>
                          <Badge
                            className={`text-xs ${getDifficultyColor(topic.difficulty)}`}
                          >
                            {topic.difficulty}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">
                            Quality Score
                          </Label>
                          <p className="font-medium text-sm text-green-600">
                            {topic.qualityScore}%
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">
                            Engagement Prediction
                          </Label>
                          <p className="font-medium text-sm text-blue-600">
                            {topic.engagementPrediction}%
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {topic.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {topic.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateTopicStatus(topic.id, "approved")
                            }
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateTopicStatus(topic.id, "rejected")
                            }
                            className="text-red-600 hover:text-red-700"
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTopic(topic.id)}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* A/B Testing Panel */}
      {showABTest && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <BarChart3 className="h-5 w-5" />
              Playful A/B Testing Results
            </CardTitle>
            <CardDescription>
              See which topic variations perform better with your audience! 🎭
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-purple-200">
                <h4 className="font-semibold text-gray-900 mb-2">
                  🅰️ Variant A Performance
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Click-through Rate</span>
                    <span className="font-semibold text-green-600">3.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Engagement Score</span>
                    <span className="font-semibold text-blue-600">87%</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg border border-purple-200">
                <h4 className="font-semibold text-gray-900 mb-2">
                  🅱️ Variant B Performance
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Click-through Rate</span>
                    <span className="font-semibold text-green-600">4.1%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Engagement Score</span>
                    <span className="font-semibold text-blue-600">91%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                🎉 <strong>Winner:</strong> Variant B is performing 28% better!
                Consider using similar angles for future topics.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
