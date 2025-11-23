/**
 * Insights Generator
 * Uses LLM to generate human-readable insights and suggestions
 */

import { UserInsights } from './analytics-service';
import { getLLMProvider } from '@/lib/llm';

export class InsightsGenerator {
  /**
   * Generate a human-readable summary of user insights
   */
  async generateInsightsSummary(insights: UserInsights): Promise<string> {
    const llm = getLLMProvider();

    // Build context about the user
    const context = this.buildInsightsContext(insights);

    const prompt = `You are an analytics assistant helping a user understand their usage patterns of a cultural intelligence app called Zeitgeist.

Based on the following data about the user's behavior, generate a friendly, insightful 2-3 paragraph summary:

${context}

Your summary should:
1. Highlight interesting patterns and trends
2. Point out their most active times and favorite interests
3. Acknowledge growth or changes in behavior
4. Be encouraging and personalized
5. Use a casual, friendly tone

Generate the summary now:`;

    try {
      const response = await llm.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 300,
      });

      return response.trim();
    } catch (error) {
      console.error('Failed to generate insights summary with LLM:', error);
      // Fallback to basic summary
      return this.generateBasicSummary(insights);
    }
  }

  /**
   * Suggest new interests based on matched vibes
   */
  async suggestNewInterests(insights: UserInsights): Promise<string[]> {
    const llm = getLLMProvider();

    // Get current interests
    const currentInterests = insights.topInterests.map(i => i.interest).join(', ');

    // Get top matched vibes
    const topVibes = insights.topMatchedVibes.slice(0, 10).map(v => v.vibeName).join(', ');

    const prompt = `Based on a user's current interests and the cultural vibes they've been matched with, suggest 5 new interests they might enjoy exploring.

Current interests: ${currentInterests || 'None yet'}
Top matched vibes: ${topVibes || 'None yet'}

Suggest interests that:
1. Are related to their current interests but expand their horizons
2. Connect to the vibes they've been matched with
3. Are specific and actionable (e.g., "jazz music" not just "music")
4. Are trendy and culturally relevant

Return ONLY a comma-separated list of 5 interest suggestions, nothing else:`;

    try {
      const response = await llm.generateText(prompt, {
        temperature: 0.8,
        maxTokens: 100,
      });

      // Parse comma-separated list
      const suggestions = response
        .trim()
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0 && s.length < 50)
        .slice(0, 5);

      return suggestions;
    } catch (error) {
      console.error('Failed to suggest interests with LLM:', error);
      return [];
    }
  }

  /**
   * Detect interesting patterns in user behavior
   */
  async detectPatterns(insights: UserInsights): Promise<string[]> {
    const llm = getLLMProvider();

    const context = this.buildInsightsContext(insights);

    const prompt = `Analyze a user's behavior patterns on a cultural intelligence app and identify 3-5 interesting, specific patterns.

${context}

Identify patterns like:
- Temporal patterns (e.g., "You seek advice before weekend social events")
- Interest correlations (e.g., "Your tech interest often pairs with fashion queries")
- Growth patterns (e.g., "You're increasingly exploring regional vibes")
- Satisfaction patterns (e.g., "You rate scenario X higher than scenario Y")

Return a JSON array of 3-5 pattern strings, each being a complete sentence:`;

    try {
      const response = await llm.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 300,
      });

      // Try to parse JSON
      const patterns = JSON.parse(response.trim());
      if (Array.isArray(patterns)) {
        return patterns.slice(0, 5);
      }

      return [];
    } catch (error) {
      console.error('Failed to detect patterns with LLM:', error);
      return this.detectBasicPatterns(insights);
    }
  }

  /**
   * Build context string from insights
   */
  private buildInsightsContext(insights: UserInsights): string {
    const parts: string[] = [];

    parts.push(`Total queries: ${insights.totalQueries}`);
    parts.push(`Queries this month: ${insights.queriesThisMonth}`);
    parts.push(`Queries last month: ${insights.queriesLastMonth}`);

    if (insights.topInterests.length > 0) {
      const topInterestsList = insights.topInterests
        .slice(0, 5)
        .map(i => `${i.interest} (${i.count} times)`)
        .join(', ');
      parts.push(`Top interests: ${topInterestsList}`);
    }

    if (insights.topRegions.length > 0) {
      parts.push(`Primary region: ${insights.topRegions[0].region}`);
    }

    if (insights.queryPatterns.busyDays.length > 0) {
      const busiestDay = insights.queryPatterns.busyDays[0];
      parts.push(`Most active on: ${busiestDay.day}s (${busiestDay.count} queries)`);
    }

    if (insights.queryPatterns.busyHours.length > 0) {
      const busiestHour = insights.queryPatterns.busyHours[0];
      parts.push(`Peak activity hour: ${busiestHour.hour}:00 (${busiestHour.count} queries)`);
    }

    parts.push(`Average satisfaction: ${insights.satisfaction.averageRating.toFixed(1)}/5`);
    parts.push(`Helpful percentage: ${insights.satisfaction.helpfulPercentage.toFixed(1)}%`);
    parts.push(`Query growth: ${insights.trends.queryGrowth > 0 ? '+' : ''}${insights.trends.queryGrowth.toFixed(1)}%`);
    parts.push(`Satisfaction trend: ${insights.trends.satisfactionTrend}`);

    if (insights.trends.emergingInterests.length > 0) {
      parts.push(`Emerging interests: ${insights.trends.emergingInterests.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Generate a basic summary without LLM (fallback)
   */
  private generateBasicSummary(insights: UserInsights): string {
    const parts: string[] = [];

    parts.push(`You've made ${insights.totalQueries} queries in total, with ${insights.queriesThisMonth} this month.`);

    if (insights.trends.queryGrowth > 10) {
      parts.push(`Your usage has grown by ${insights.trends.queryGrowth.toFixed(1)}% compared to last month!`);
    } else if (insights.trends.queryGrowth < -10) {
      parts.push(`Your usage has decreased by ${Math.abs(insights.trends.queryGrowth).toFixed(1)}% compared to last month.`);
    }

    if (insights.topInterests.length > 0) {
      const topInterestNames = insights.topInterests.slice(0, 3).map(i => i.interest).join(', ');
      parts.push(`Your top interests are: ${topInterestNames}.`);
    }

    if (insights.satisfaction.totalRatings > 0) {
      parts.push(`Your average satisfaction rating is ${insights.satisfaction.averageRating.toFixed(1)}/5 stars.`);
    }

    return parts.join(' ');
  }

  /**
   * Detect basic patterns without LLM (fallback)
   */
  private detectBasicPatterns(insights: UserInsights): string[] {
    const patterns: string[] = [];

    // Check if user is most active on weekends
    const weekendDays = ['Saturday', 'Sunday'];
    const weekendQueries = insights.queryPatterns.busyDays
      .filter(d => weekendDays.includes(d.day))
      .reduce((sum, d) => sum + d.count, 0);
    const totalDayQueries = insights.queryPatterns.busyDays
      .reduce((sum, d) => sum + d.count, 0);

    if (weekendQueries > totalDayQueries * 0.4) {
      patterns.push('You tend to seek advice more on weekends, possibly for social events');
    }

    // Check if user is most active in the evening
    const eveningHours = insights.queryPatterns.busyHours
      .filter(h => h.hour >= 18 && h.hour <= 22)
      .reduce((sum, h) => sum + h.count, 0);
    const totalHourQueries = insights.queryPatterns.busyHours
      .reduce((sum, h) => sum + h.count, 0);

    if (eveningHours > totalHourQueries * 0.4) {
      patterns.push('You primarily use the app in the evening hours (6-10 PM)');
    }

    // Check for growth trend
    if (insights.trends.queryGrowth > 20) {
      patterns.push('Your engagement is rapidly increasing, showing growing interest in cultural trends');
    }

    // Check for high satisfaction
    if (insights.satisfaction.averageRating >= 4.0) {
      patterns.push('You consistently rate advice highly, indicating strong satisfaction with recommendations');
    }

    return patterns.slice(0, 5);
  }
}
