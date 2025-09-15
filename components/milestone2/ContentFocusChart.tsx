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
import {
  Target,
  TrendingUp,
  Search,
  Award,
  Zap,
  Plus,
  Edit3,
  Trash2,
  GripVertical,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface NicheData {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  searchVolume: number;
  competition: "Low" | "Medium" | "High";
  seoReachGoal: number;
  currentReach: number;
  engagementScore: number;
  color: string;
  badges: string[];
}

interface ContentFocusChartProps {
  initialNiches?: NicheData[];
  onNichesChange?: (niches: NicheData[]) => void;
}

const defaultNiches: NicheData[] = [
  {
    id: "1",
    name: "Tech Reviews",
    description: "In-depth technology product reviews and comparisons",
    targetAudience: "Tech enthusiasts, early adopters",
    searchVolume: 15000,
    competition: "High",
    seoReachGoal: 50000,
    currentReach: 12500,
    engagementScore: 85,
    color: "bg-blue-500",
    badges: ["High Engagement", "Trending"],
  },
  {
    id: "2",
    name: "Sustainable Living",
    description: "Eco-friendly lifestyle tips and green product guides",
    targetAudience: "Environmentally conscious consumers",
    searchVolume: 8500,
    competition: "Medium",
    seoReachGoal: 25000,
    currentReach: 18750,
    engagementScore: 92,
    color: "bg-green-500",
    badges: ["Growing Fast", "High Quality"],
  },
  {
    id: "3",
    name: "Remote Work Tools",
    description: "Productivity tools and tips for remote workers",
    targetAudience: "Remote workers, digital nomads",
    searchVolume: 12000,
    competition: "Medium",
    seoReachGoal: 35000,
    currentReach: 8750,
    engagementScore: 78,
    color: "bg-purple-500",
    badges: ["Opportunity"],
  },
];

export function ContentFocusChart({
  initialNiches = defaultNiches,
  onNichesChange,
}: ContentFocusChartProps) {
  const [niches, setNiches] = useState<NicheData[]>(initialNiches);
  const [_editingNiche, _setEditingNiche] = useState<string | null>(null);
  const [_showAddForm, _setShowAddForm] = useState(false);

  const handleDragEnd = useCallback(
    (result: any) => {
      if (!result.destination) return;

      const items = Array.from(niches);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      setNiches(items);
      onNichesChange?.(items);
    },
    [niches, onNichesChange],
  );

  const addNewNiche = () => {
    const newNiche: NicheData = {
      id: Date.now().toString(),
      name: "New Niche",
      description: "Add your description here",
      targetAudience: "Define your audience",
      searchVolume: 0,
      competition: "Low",
      seoReachGoal: 10000,
      currentReach: 0,
      engagementScore: 0,
      color: "bg-gray-500",
      badges: ["New"],
    };

    const updatedNiches = [...niches, newNiche];
    setNiches(updatedNiches);
    onNichesChange?.(updatedNiches);
    _setEditingNiche(newNiche.id);
  };

  const deleteNiche = (id: string) => {
    const updatedNiches = niches.filter((n) => n.id !== id);
    setNiches(updatedNiches);
    onNichesChange?.(updatedNiches);
  };

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case "Low":
        return "text-green-600 bg-green-100";
      case "Medium":
        return "text-yellow-600 bg-yellow-100";
      case "High":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const calculateProgress = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header with Gamified Elements */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-8 w-8 text-blue-600" />
            Content Focus Chart
            <Badge variant="secondary" className="ml-2">
              <Award className="h-4 w-4 mr-1" />
              {niches.length} Active Niches
            </Badge>
          </h2>
          <p className="text-gray-600 mt-1">
            Drag and drop to prioritize your content niches. Watch your SEO
            reach goals come to life! 🚀
          </p>
        </div>
        <Button
          onClick={addNewNiche}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Niche
        </Button>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Search Volume
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {niches
                    .reduce((sum, n) => sum + n.searchVolume, 0)
                    .toLocaleString()}
                </p>
              </div>
              <Search className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg. Engagement
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    niches.reduce((sum, n) => sum + n.engagementScore, 0) /
                      niches.length,
                  )}
                  %
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Goal Progress
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    niches.reduce(
                      (sum, n) =>
                        sum + calculateProgress(n.currentReach, n.seoReachGoal),
                      0,
                    ) / niches.length,
                  )}
                  %
                </p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Niche Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Interactive Niche Mapping
          </CardTitle>
          <CardDescription>
            Drag to reorder by priority. Click to edit. Watch your engagement
            badges grow! ✨
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="niches">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {niches.map((niche, index) => (
                    <Draggable
                      key={niche.id}
                      draggableId={niche.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`
                            bg-white border rounded-lg p-6 shadow-sm transition-all duration-200
                            ${snapshot.isDragging ? "shadow-lg scale-105 rotate-2" : "hover:shadow-md"}
                          `}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div
                                {...provided.dragHandleProps}
                                className="mt-2 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="h-5 w-5 text-gray-400" />
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div
                                    className={`w-4 h-4 rounded-full ${niche.color}`}
                                  />
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {niche.name}
                                  </h3>
                                  <div className="flex gap-1">
                                    {niche.badges.map((badge, i) => (
                                      <Badge
                                        key={i}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {badge}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                <p className="text-gray-600 mb-3">
                                  {niche.description}
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                  <div>
                                    <Label className="text-xs text-gray-500">
                                      Search Volume
                                    </Label>
                                    <p className="font-semibold">
                                      {niche.searchVolume.toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-500">
                                      Competition
                                    </Label>
                                    <Badge
                                      className={`text-xs ${getCompetitionColor(niche.competition)}`}
                                    >
                                      {niche.competition}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-500">
                                      Engagement
                                    </Label>
                                    <p className="font-semibold text-green-600">
                                      {niche.engagementScore}%
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-500">
                                      Audience
                                    </Label>
                                    <p className="text-sm text-gray-700">
                                      {niche.targetAudience}
                                    </p>
                                  </div>
                                </div>

                                {/* SEO Reach Progress */}
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <Label className="text-sm font-medium">
                                      SEO Reach Goal
                                    </Label>
                                    <span className="text-sm text-gray-600">
                                      {niche.currentReach.toLocaleString()} /{" "}
                                      {niche.seoReachGoal.toLocaleString()}
                                    </span>
                                  </div>
                                  <Progress
                                    value={calculateProgress(
                                      niche.currentReach,
                                      niche.seoReachGoal,
                                    )}
                                    className="h-2"
                                  />
                                  <p className="text-xs text-gray-500">
                                    {calculateProgress(
                                      niche.currentReach,
                                      niche.seoReachGoal,
                                    ).toFixed(1)}
                                    % complete
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => _setEditingNiche(niche.id)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteNiche(niche.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>

      {/* Smart Suggestions Panel */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Zap className="h-5 w-5" />
            Smart Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-gray-900 mb-2">
                🎯 Optimization Tip
              </h4>
              <p className="text-sm text-gray-600">
                Your "Sustainable Living" niche has 92% engagement! Consider
                creating more content in this area.
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-gray-900 mb-2">
                📈 Growth Opportunity
              </h4>
              <p className="text-sm text-gray-600">
                "Remote Work Tools" has low competition and good search volume.
                Perfect for expansion!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
