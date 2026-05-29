import type { IFlatItem } from '@shared/types';

export interface ITreeItem<T> extends IFlatItem {
  parentId?: string;
  children?: T[];
}
