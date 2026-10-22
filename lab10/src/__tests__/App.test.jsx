import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import { filterTasks, getStatus, hydrateTask } from '../utils/tasks.js';
import data from '../../public/data/tasks.json';

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => data })));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => vi.unstubAllGlobals());

describe('утилиты задач', () => {
    it('считает задачу просроченной, если срок прошёл, а она не выполнена', () => {
        const now = new Date();
        const overdue = hydrateTask({ ...data.tasks[0], dayOffset: -1, status: 'progress' }, now);
        const done = hydrateTask({ ...data.tasks[0], dayOffset: -1, status: 'done' }, now);
        expect(getStatus(overdue, now)).toBe('overdue');
        expect(getStatus(done, now)).toBe('done');
    });

    it('ищет по названию, описанию и меткам', () => {
        const tasks = data.tasks.map(t => hydrateTask(t));
        expect(filterTasks(tasks, { search: 'hooks' }).map(t => t.id)).toEqual([4]);
        expect(filterTasks(tasks, { tag: 'Разработка' })).toHaveLength(4);
    });
});

describe('App', () => {
    it('загружает задачи, добавляет и удаляет задачу', async () => {
        render(<App />);
        expect(screen.getByText(/Загрузка задач/)).toBeInTheDocument();
        await screen.findByText('Подготовить презентацию');
        expect(screen.getAllByRole('row')).toHaveLength(13); // заголовок + 12 задач

        await userEvent.click(screen.getByRole('button', { name: /Добавить задачу/ }));
        const dialog = screen.getByRole('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Добавить' }));
        expect(within(dialog).getByText(/не короче 3 символов/)).toBeInTheDocument();

        await userEvent.type(within(dialog).getByLabelText(/^Название/), 'Сдать практическую работу №10');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Добавить' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByText('Сдать практическую работу №10')).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem('taskflow.tasks.v1'))).toHaveLength(13);

        await userEvent.click(screen.getByRole('button', { name: 'Удалить «Сдать практическую работу №10»' }));
        await waitFor(() => expect(screen.queryByText('Сдать практическую работу №10')).not.toBeInTheDocument());
    });

    it('фильтрует по вкладке и поиску, показывает пустое состояние', async () => {
        render(<App />);
        await screen.findByText('Подготовить презентацию');
        await userEvent.click(screen.getByRole('tab', { name: /Просроченные/ }));
        expect(screen.getAllByRole('row')).toHaveLength(3);
        await userEvent.type(screen.getByLabelText('Поиск задач'), 'нет такой задачи');
        expect(screen.getByText(/Ничего не найдено/)).toBeInTheDocument();
    });

    it('показывает ошибку загрузки и кнопку повтора', async () => {
        fetch.mockResolvedValueOnce({ ok: false, status: 500 });
        render(<App />);
        expect(await screen.findByText(/Не удалось загрузить задачи/)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
        expect(await screen.findByText('Подготовить презентацию')).toBeInTheDocument();
    });
});
