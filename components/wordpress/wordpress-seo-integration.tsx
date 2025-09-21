/**
 * WordPress SEO Integration Component
 * Handles WordPress-specific SEO features and form auto-fill
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Settings,
  FileText,
  Tag,
  Image,
  Link,
  Zap,
  Globe
} from 'lucide-react';

interface WordPressPluginConfig {
  yoast: {
    enabled: boolean;
    fields: Record<string, any>;
  };
  rankmath: {
    enabled: boolean;
    fields: Record<string, any>;
  };
  seopress: {
    enabled: boolean;
    fields: Record<string, any>;
  };
}

interface WordPressFormData {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  meta: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonical?: string;
    robots?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
  };
  categories?: number[];
  tags?: number[];
  featuredImage?: number;
}

interface WordPressSEOIntegrationProps {
  siteId: string;
  siteUrl: string;
}

export function WordPressSEOIntegration({ siteId, siteUrl }: WordPressSEOIntegrationProps) {
  const [pluginConfig, setPluginConfig] = useState<WordPressPluginConfig | null>(null);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [tags, setTags] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [formData, setFormData] = useState<WordPressFormData>({
    title: '',
    content: '',
    meta: {},
  });

  useEffect(() => {
    loadWordPressData();
  }, [siteId]);

  const loadWordPressData = async () => {
    try {
      setLoading(true);
      
      // Load plugin configuration
      const pluginResponse = await fetch(`/api/wordpress/seo?siteId=${siteId}&action=plugin_config`);
      const pluginData = await pluginResponse.json();
      if (pluginData.success) {
        setPluginConfig(pluginData.pluginConfig);
      }

      // Load categories
      const categoriesResponse = await fetch(`/api/wordpress/seo?siteId=${siteId}&action=categories`);
      const categoriesData = await categoriesResponse.json();
      if (categoriesData.success) {
        setCategories(categoriesData.categories);
      }

      // Load tags
      const tagsResponse = await fetch(`/api/wordpress/seo?siteId=${siteId}&action=tags`);
      const tagsData = await tagsResponse.json();
      if (tagsData.success) {
        setTags(tagsData.tags);
      }
    } catch (error) {
      console.error('Failed to load WordPress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeWordPressSEO = async () => {
    try {
      setAnalyzing(true);
      const response = await fetch('/api/wordpress/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          action: 'analyze_wordpress_seo',
          data: { siteUrl },
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log('WordPress SEO analysis completed:', data.analysis);
      } else {
        console.error('Analysis failed:', data.error);
      }
    } catch (error) {
      console.error('Failed to analyze WordPress SEO:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateOptimizedData = async () => {
    if (!formData.title || !formData.content) {
      alert('Please enter title and content first');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/wordpress/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          action: 'generate_optimized_data',
          data: {
            title: formData.title,
            content: formData.content,
            keywords: formData.meta.keywords || [],
            siteUrl,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          ...data.optimizedData,
        }));
      } else {
        console.error('Failed to generate optimized data:', data.error);
      }
    } catch (error) {
      console.error('Failed to generate optimized data:', error);
    } finally {
      setLoading(false);
    }
  };

  const suggestCategories = async () => {
    if (!formData.content) {
      alert('Please enter content first');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/wordpress/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          action: 'suggest_categories',
          data: {
            content: formData.content,
            keywords: formData.meta.keywords || [],
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log('Category suggestions:', data.suggestions);
        // You could show these suggestions in a modal or dropdown
      } else {
        console.error('Failed to get category suggestions:', data.error);
      }
    } catch (error) {
      console.error('Failed to get category suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateMetaData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading WordPress SEO data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WordPress SEO Integration</h2>
          <p className="text-gray-600">Optimize your WordPress content with AI-powered SEO</p>
        </div>
        <Button 
          onClick={analyzeWordPressSEO} 
          disabled={analyzing}
          className="flex items-center gap-2"
        >
          {analyzing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {analyzing ? 'Analyzing...' : 'Analyze WordPress SEO'}
        </Button>
      </div>

      {/* Plugin Status */}
      {pluginConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              WordPress SEO Plugins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={pluginConfig.yoast.enabled ? 'default' : 'secondary'}>
                  Yoast SEO
                </Badge>
                {pluginConfig.yoast.enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={pluginConfig.rankmath.enabled ? 'default' : 'secondary'}>
                  RankMath
                </Badge>
                {pluginConfig.rankmath.enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={pluginConfig.seopress.enabled ? 'default' : 'secondary'}>
                  SEOPress
                </Badge>
                {pluginConfig.seopress.enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Form */}
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="seo">SEO Meta</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="categories">Categories & Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Content Editor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Post Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="Enter your post title..."
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => updateFormData('content', e.target.value)}
                  placeholder="Enter your post content..."
                  rows={10}
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt || ''}
                  onChange={(e) => updateFormData('excerpt', e.target.value)}
                  placeholder="Enter post excerpt..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug || ''}
                  onChange={(e) => updateFormData('slug', e.target.value)}
                  placeholder="post-slug"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={generateOptimizedData} disabled={loading}>
                  <Zap className="h-4 w-4 mr-2" />
                  Optimize Content
                </Button>
                <Button onClick={suggestCategories} disabled={loading} variant="outline">
                  <Tag className="h-4 w-4 mr-2" />
                  Suggest Categories
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                SEO Meta Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seo-title">SEO Title</Label>
                <Input
                  id="seo-title"
                  value={formData.meta.title || ''}
                  onChange={(e) => updateMetaData('title', e.target.value)}
                  placeholder="SEO optimized title..."
                />
                <p className="text-sm text-gray-600 mt-1">
                  {(formData.meta.title || '').length}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="meta-description">Meta Description</Label>
                <Textarea
                  id="meta-description"
                  value={formData.meta.description || ''}
                  onChange={(e) => updateMetaData('description', e.target.value)}
                  placeholder="Meta description for search engines..."
                  rows={3}
                />
                <p className="text-sm text-gray-600 mt-1">
                  {(formData.meta.description || '').length}/160 characters
                </p>
              </div>

              <div>
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  value={(formData.meta.keywords || []).join(', ')}
                  onChange={(e) => updateMetaData('keywords', e.target.value.split(',').map(k => k.trim()))}
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>

              <div>
                <Label htmlFor="canonical">Canonical URL</Label>
                <Input
                  id="canonical"
                  value={formData.meta.canonical || ''}
                  onChange={(e) => updateMetaData('canonical', e.target.value)}
                  placeholder="https://example.com/canonical-url"
                />
              </div>

              <div>
                <Label htmlFor="robots">Robots Meta</Label>
                <Select
                  value={formData.meta.robots || 'index,follow'}
                  onValueChange={(value) => updateMetaData('robots', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select robots meta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="index,follow">Index, Follow</SelectItem>
                    <SelectItem value="index,nofollow">Index, No Follow</SelectItem>
                    <SelectItem value="noindex,follow">No Index, Follow</SelectItem>
                    <SelectItem value="noindex,nofollow">No Index, No Follow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Social Media Meta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="og-title">Open Graph Title</Label>
                <Input
                  id="og-title"
                  value={formData.meta.ogTitle || ''}
                  onChange={(e) => updateMetaData('ogTitle', e.target.value)}
                  placeholder="Social media title..."
                />
              </div>

              <div>
                <Label htmlFor="og-description">Open Graph Description</Label>
                <Textarea
                  id="og-description"
                  value={formData.meta.ogDescription || ''}
                  onChange={(e) => updateMetaData('ogDescription', e.target.value)}
                  placeholder="Social media description..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="og-image">Open Graph Image URL</Label>
                <Input
                  id="og-image"
                  value={formData.meta.ogImage || ''}
                  onChange={(e) => updateMetaData('ogImage', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <Label htmlFor="twitter-title">Twitter Title</Label>
                <Input
                  id="twitter-title"
                  value={formData.meta.twitterTitle || ''}
                  onChange={(e) => updateMetaData('twitterTitle', e.target.value)}
                  placeholder="Twitter title..."
                />
              </div>

              <div>
                <Label htmlFor="twitter-description">Twitter Description</Label>
                <Textarea
                  id="twitter-description"
                  value={formData.meta.twitterDescription || ''}
                  onChange={(e) => updateMetaData('twitterDescription', e.target.value)}
                  placeholder="Twitter description..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Categories & Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Categories</Label>
                <Select
                  value={formData.categories?.[0]?.toString() || ''}
                  onValueChange={(value) => updateFormData('categories', [parseInt(value)])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tags</Label>
                <Select
                  value={formData.tags?.[0]?.toString() || ''}
                  onValueChange={(value) => updateFormData('tags', [parseInt(value)])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id.toString()}>
                        {tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="featured-image">Featured Image ID</Label>
                <Input
                  id="featured-image"
                  type="number"
                  value={formData.featuredImage || ''}
                  onChange={(e) => updateFormData('featuredImage', parseInt(e.target.value) || undefined)}
                  placeholder="WordPress media ID"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Preview how your content will appear in search results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="text-blue-600 text-lg font-medium mb-1">
              {formData.meta.title || formData.title || 'Your Title Here'}
            </div>
            <div className="text-green-600 text-sm mb-2">
              {siteUrl}
            </div>
            <div className="text-gray-700 text-sm">
              {formData.meta.description || formData.excerpt || 'Your meta description will appear here...'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
