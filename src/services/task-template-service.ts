import type { TaskTemplate } from '../types/task-template.types';

const LOCAL_STORAGE_KEY = 'mrtao_task_templates';

export const taskTemplateService = {
  async getAll(): Promise<TaskTemplate[]> {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data) as TaskTemplate[];
    } catch {
      return [];
    }
  },

  async create(tpl: Partial<TaskTemplate>): Promise<TaskTemplate> {
    const list = await this.getAll();
    const newTpl: TaskTemplate = {
      id: `custom-tpl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: tpl.name || '',
      icon: tpl.icon || '📝',
      defaultTitle: tpl.defaultTitle || '',
      defaultDepartment: tpl.defaultDepartment || 'Showroom',
      defaultPriority: tpl.defaultPriority || 'medium',
      defaultSubtasks: tpl.defaultSubtasks || [],
      defaultNotes: tpl.defaultNotes || '',
      createdAt: new Date().toISOString(),
    };
    list.push(newTpl);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    return newTpl;
  },

  async update(id: string, input: Partial<TaskTemplate>): Promise<TaskTemplate> {
    const list = await this.getAll();
    const idx = list.findIndex(t => t.id === id);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        ...input,
        name: input.name ?? list[idx].name,
        defaultTitle: input.defaultTitle ?? list[idx].defaultTitle,
        defaultDepartment: input.defaultDepartment ?? list[idx].defaultDepartment,
        defaultPriority: input.defaultPriority ?? list[idx].defaultPriority,
        defaultSubtasks: input.defaultSubtasks ?? list[idx].defaultSubtasks,
        defaultNotes: input.defaultNotes ?? list[idx].defaultNotes,
        icon: input.icon ?? list[idx].icon,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      return list[idx];
    }
    throw new Error('Template not found');
  },

  async delete(id: string): Promise<void> {
    const list = await this.getAll();
    const filtered = list.filter(t => t.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  }
};
