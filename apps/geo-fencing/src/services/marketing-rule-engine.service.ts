/**
 * 营销规则引擎
 *
 * 负责评估和触发营销规则
 */

import type {
  MarketingRule,
  CreateRuleRequest,
  MarketingAction,
  RuleCondition,
  FenceEvent
} from './types';
import type { WebGeoDB } from 'webgeodb-core';

export class MarketingRuleEngine {
  constructor(private db: WebGeoDB) {}

  /**
   * 创建营销规则
   */
  async createRule(request: CreateRuleRequest): Promise<MarketingRule> {
    const rule: MarketingRule = {
      id: crypto.randomUUID(),
      name: request.name,
      description: request.description,
      fenceId: request.fenceId,
      trigger: request.trigger,
      dwellTime: request.dwellTime,
      action: request.action,
      conditions: request.conditions,
      priority: request.priority || 0,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.db.rules.insert(rule);
    return rule;
  }

  /**
   * 更新规则
   */
  async updateRule(
    ruleId: string,
    updates: Partial<Omit<MarketingRule, 'id' | 'createdAt'>>
  ): Promise<MarketingRule> {
    await this.db.rules.update(ruleId, {
      ...updates,
      updatedAt: Date.now()
    });

    return (await this.db.rules.get(ruleId))!;
  }

  /**
   * 删除规则
   */
  async deleteRule(ruleId: string): Promise<void> {
    await this.db.rules.delete(ruleId);
  }

  /**
   * 获取规则
   */
  async getRule(ruleId: string): Promise<MarketingRule | undefined> {
    return await this.db.rules.get(ruleId);
  }

  /**
   * 获取围栏的所有规则
   */
  async getFenceRules(fenceId: string): Promise<MarketingRule[]> {
    return await this.db.rules
      .where('fenceId', '=', fenceId)
      .where('active', '=', true)
      .orderBy('priority', 'desc')
      .toArray();
  }

  /**
   * 评估围栏事件
   */
  async evaluateEvent(event: FenceEvent): Promise<MarketingAction[]> {
    const triggeredActions: MarketingAction[] = [];

    // 获取该围栏的激活规则
    const rules = await this.getFenceRules(event.fenceId);

    // 过滤出匹配事件类型的规则
    const matchingRules = rules.filter(
      rule => rule.trigger === event.eventType
    );

    // 评估每个规则
    for (const rule of matchingRules) {
      if (await this.checkConditions(rule, event)) {
        // 检查停留时间条件
        if (rule.trigger === 'dwell' && rule.dwellTime) {
          const dwellTime = event.location.properties?.dwellTime || 0;
          if (dwellTime < rule.dwellTime) {
            continue;
          }
        }

        triggeredActions.push(rule.action);

        // 记录触发的规则
        await this.db.fenceEvents.update(event.id, {
          triggeredRules: [...event.triggeredRules, rule.id]
        });
      }
    }

    return triggeredActions;
  }

  /**
   * 批量评估事件
   */
  async evaluateEvents(events: FenceEvent[]): Promise<
    Array<{
      eventId: string;
      actions: MarketingAction[];
    }>
  > {
    const results = await Promise.all(
      events.map(async event => ({
        eventId: event.id,
        actions: await this.evaluateEvent(event)
      }))
    );

    return results;
  }

  /**
   * 检查规则条件
   */
  private async checkConditions(
    rule: MarketingRule,
    event: FenceEvent
  ): Promise<boolean> {
    // 如果没有条件，默认通过
    if (!rule.conditions || rule.conditions.length === 0) {
      return true;
    }

    // 所有条件都必须满足
    for (const condition of rule.conditions) {
      const passes = await this.checkCondition(condition, event);
      if (!passes) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查单个条件
   */
  private async checkCondition(
    condition: RuleCondition,
    event: FenceEvent
  ): Promise<boolean> {
    const now = Date.now();

    switch (condition.type) {
      case 'time':
        return this.checkTimeCondition(condition, now);

      case 'day-of-week':
        return this.checkDayOfWeekCondition(condition, now);

      case 'frequency':
        return await this.checkFrequencyCondition(condition, event);

      case 'user-segment':
        return await this.checkUserSegmentCondition(condition, event);

      default:
        return true;
    }
  }

  /**
   * 检查时间条件
   */
  private checkTimeCondition(condition: RuleCondition, now: number): boolean {
    const hour = new Date(now).getHours();

    switch (condition.operator) {
      case 'equals':
        return hour === condition.value;
      case 'not-equals':
        return hour !== condition.value;
      case 'in':
        return condition.value.includes(hour);
      case 'not-in':
        return !condition.value.includes(hour);
      case 'greater-than':
        return hour > condition.value;
      case 'less-than':
        return hour < condition.value;
      default:
        return true;
    }
  }

  /**
   * 检查星期条件
   */
  private checkDayOfWeekCondition(
    condition: RuleCondition,
    now: number
  ): boolean {
    const day = new Date(now).getDay(); // 0 = Sunday, 1 = Monday, ...

    switch (condition.operator) {
      case 'equals':
        return day === condition.value;
      case 'not-equals':
        return day !== condition.value;
      case 'in':
        return condition.value.includes(day);
      case 'not-in':
        return !condition.value.includes(day);
      default:
        return true;
    }
  }

  /**
   * 检查频率条件
   */
  private async checkFrequencyCondition(
    condition: RuleCondition,
    event: FenceEvent
  ): Promise<boolean> {
    const timeWindow = condition.value.timeWindow || 86400000; // 默认24小时
    const maxCount = condition.value.maxCount || 1;

    const startTime = event.timestamp - timeWindow;

    const recentEvents = await this.db.fenceEvents
      .where('userId', '=', event.userId)
      .where('fenceId', '=', event.fenceId)
      .where('timestamp', '>', startTime)
      .toArray();

    return recentEvents.length < maxCount;
  }

  /**
   * 检查用户分群条件
   */
  private async checkUserSegmentCondition(
    condition: RuleCondition,
    event: FenceEvent
  ): Promise<boolean> {
    // 这里可以接入用户分群服务
    // 简化实现：假设用户属性存储在用户表中
    const user = await this.db.users.get(event.userId);

    if (!user) {
      return false;
    }

    const segment = user.segment || 'default';

    switch (condition.operator) {
      case 'equals':
        return segment === condition.value;
      case 'not-equals':
        return segment !== condition.value;
      case 'in':
        return condition.value.includes(segment);
      case 'not-in':
        return !condition.value.includes(segment);
      default:
        return true;
    }
  }

  /**
   * 获取规则统计
   */
  async getRuleStats(ruleId: string): Promise<{
    totalTriggers: number;
    uniqueUsers: number;
    conversionRate: number;
    avgResponseTime: number;
  }> {
    const events = await this.db.fenceEvents
      .where('triggeredRules', 'contains', ruleId)
      .toArray();

    const uniqueUsers = new Set(events.map(e => e.userId)).size;

    // 计算转化率
    const conversions = await this.db.userInteractions
      .where('action', '=', 'converted')
      .toArray();

    const convertedUsers = new Set(
      conversions
        .filter(c => events.some(e => e.userId === c.userId))
        .map(c => c.userId)
    ).size;

    const conversionRate =
      uniqueUsers > 0 ? (convertedUsers / uniqueUsers) * 100 : 0;

    // 计算平均响应时间
    const responseTimes = await Promise.all(
      events.map(async event => {
        const interaction = await this.db.userInteractions
          .where('userId', '=', event.userId)
          .where('timestamp', '>=', event.timestamp)
          .first();

        if (interaction) {
          return interaction.timestamp - event.timestamp;
        }
        return 0;
      })
    );

    const validResponseTimes = responseTimes.filter(t => t > 0);
    const avgResponseTime =
      validResponseTimes.length > 0
        ? validResponseTimes.reduce((sum, t) => sum + t, 0) /
          validResponseTimes.length
        : 0;

    return {
      totalTriggers: events.length,
      uniqueUsers,
      conversionRate,
      avgResponseTime
    };
  }

  /**
   * 启用/禁用规则
   */
  async toggleRule(ruleId: string, active: boolean): Promise<void> {
    await this.db.rules.update(ruleId, { active });
  }

  /**
   * 复制规则
   */
  async duplicateRule(ruleId: string): Promise<MarketingRule> {
    const original = await this.db.rules.get(ruleId);
    if (!original) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    const duplicate: MarketingRule = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (副本)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.db.rules.insert(duplicate);
    return duplicate;
  }
}
