import type { CSSProperties } from 'react';
import { CATEGORIES, type Item } from '../data/content';

export const KIND_LABEL: Record<Item['kind'], string> = {
    role: 'Experience',
    project: 'Project',
    skill: 'Skill',
    education: 'Education',
    publication: 'Research',
    certification: 'Certification'
};

export const colour = (item: Item) => ({ '--c': CATEGORIES[item.category].color } as CSSProperties);

// Asks the page to scroll to an item's section (handled in index.astro)
export const reveal = (id: string) => document.dispatchEvent(new CustomEvent('portfolio:reveal', { detail: id }));
