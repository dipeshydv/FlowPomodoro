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
    }

    save() {
        Storage.set('flow_tasks', this.tasks);
    }

    getTasks() {
        return this.tasks;
    }
}
