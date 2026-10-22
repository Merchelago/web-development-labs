import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AddTaskButton from '../AddTaskButton.jsx';
import Calendar from '../Calendar.jsx';
import SearchBar from '../SearchBar.jsx';
import Sidebar from '../Sidebar.jsx';
import TaskTabs from '../TaskTabs.jsx';
import { TABS, TAGS } from '../../utils/tasks.js';

describe('Sidebar', () => {
    it('выделяет активный раздел и сообщает о выборе другого', async () => {
        const onSelect = vi.fn();
        render(<Sidebar active="tasks" onSelect={onSelect} />);
        expect(screen.getByRole('button', { name: 'Задачи' })).toHaveClass('is-active');
        await userEvent.click(screen.getByRole('button', { name: 'Статистика' }));
        expect(onSelect).toHaveBeenCalledWith('stats');
    });
});

describe('SearchBar', () => {
    it('передаёт введённый текст и выбранную метку родителю', async () => {
        const onSearchChange = vi.fn();
        const onTagChange = vi.fn();
        render(<SearchBar search="" onSearchChange={onSearchChange} tag="all" onTagChange={onTagChange} tags={TAGS} />);
        await userEvent.type(screen.getByLabelText('Поиск задач'), 'R');
        expect(onSearchChange).toHaveBeenLastCalledWith('R');
        await userEvent.selectOptions(screen.getByLabelText('Фильтр по меткам'), 'Проект');
        expect(onTagChange).toHaveBeenCalledWith('Проект');
    });
});

describe('TaskTabs', () => {
    it('показывает счётчики и переключает вкладку', async () => {
        const onChange = vi.fn();
        const counts = { all: 12, today: 3, progress: 3, done: 6, overdue: 2 };
        render(<TaskTabs tabs={TABS} active="all" counts={counts} onChange={onChange} />);
        expect(screen.getByRole('tab', { name: /Все/ })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: /Просроченные/ })).toHaveTextContent('2');
        await userEvent.click(screen.getByRole('tab', { name: /Сегодня/ }));
        expect(onChange).toHaveBeenCalledWith('today');
    });
});

describe('AddTaskButton', () => {
    it('вызывает обработчик и не реагирует в состоянии disabled', async () => {
        const onClick = vi.fn();
        const { rerender } = render(<AddTaskButton onClick={onClick} />);
        await userEvent.click(screen.getByRole('button', { name: /Добавить задачу/ }));
        expect(onClick).toHaveBeenCalledTimes(1);
        rerender(<AddTaskButton onClick={onClick} disabled />);
        await userEvent.click(screen.getByRole('button', { name: /Добавить задачу/ }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

describe('Calendar', () => {
    const now = new Date(2026, 9, 22, 10, 0);
    it('листает месяцы и выбирает дату', async () => {
        const onSelectDate = vi.fn();
        render(<Calendar now={now} selectedDate={null} onSelectDate={onSelectDate} />);
        expect(screen.getByText('Октябрь 2026')).toBeInTheDocument();
        await userEvent.click(screen.getByLabelText('Следующий месяц'));
        expect(screen.getByText('Ноябрь 2026')).toBeInTheDocument();
        await userEvent.click(screen.getByLabelText('Предыдущий месяц'));
        await userEvent.click(screen.getByRole('button', { name: '16 октября' }));
        const picked = onSelectDate.mock.calls[0][0];
        expect(picked.getDate()).toBe(16);
        expect(picked.getMonth()).toBe(9);
    });

    it('при выборе даты извне перелистывается на её месяц', () => {
        const { rerender } = render(<Calendar now={now} selectedDate={null} onSelectDate={() => {}} />);
        rerender(<Calendar now={now} selectedDate={new Date(2027, 0, 5)} onSelectDate={() => {}} />);
        expect(screen.getByText('Январь 2027')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '5 января' })).toHaveClass('is-selected');
    });
});
