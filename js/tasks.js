import { Storage } from './storage.js';

export class TaskManager {

    constructor() {
        this.tasks = Storage.get('flow_tasks', []);
    }

    addTask(text) {
        if (!text || !text.trim()) return null;
        const task = { id: Date.now(), text: text.trim(), completed: false };
        this.tasks.push(task);
        this.save();
        return task;
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.save();
        }
        return task;
    }

    deleteTask(id) {
        const idx = this.tasks.findIndex(t => t.id === id);
        if (idx === -1) return false;
        this.tasks.splice(idx, 1);
        this.save();
        return true;
    }

    save() {
        Storage.set('flow_tasks', this.tasks);
    }

    getTasks() {
        return this.tasks;
    }

    getStats() {
        return {
            total:     this.tasks.length,
            completed: this.tasks.filter(t =>  t.completed).length,
            pending:   this.tasks.filter(t => !t.completed).length,
        };
    }
}
