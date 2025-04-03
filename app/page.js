"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [urgency, setUrgency] = useState(5);
  const [importance, setImportance] = useState(5);
  const [enjoyment, setEnjoyment] = useState(5);
  const [time, setTime] = useState(30);
  const [isRecurring, setIsRecurring] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Check authentication status
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        router.push('/login');
      } else {
        setLoading(false);
        // Load tasks from database
        fetchTasks();
      }
    };
    
    getUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          setUser(session.user);
          setLoading(false);
          fetchTasks();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          router.push('/login');
        }
      }
    );
    
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [router]);

  // Fetch tasks from Supabase database
  const fetchTasks = async () => {
    if (!user) return;
    
    // Fetch active tasks
    const { data: activeTasks, error: activeError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .order('created_at', { ascending: false });
    
    if (activeError) {
      console.error('Error fetching active tasks:', activeError);
    } else {
      setTasks(activeTasks);
    }
    
    // Fetch completed tasks
    const { data: completedTasksData, error: completedError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .order('completed_at', { ascending: false });
    
    if (completedError) {
      console.error('Error fetching completed tasks:', completedError);
    } else {
      setCompletedTasks(completedTasksData);
    }
  };
  
  const calculateScore = (task) => {
    return (task.urgency * 0.34) + (task.importance * 0.33) + (task.enjoyment * 0.33);
  };
  
  const getNextTask = () => {
    if (tasks.length === 0) return null;
    return tasks.reduce((prev, current) => 
      calculateScore(current) > calculateScore(prev) ? current : prev
    );
  };
  
  const addTask = async () => {
  if (!newTask.trim() || !user) {
    console.log("Cannot add task: empty task or no user");
    return;
  }
  
  const newTaskData = {
    text: newTask,
    urgency,
    importance,
    enjoyment,
    time,
    is_recurring: isRecurring,
    is_completed: false,
    user_id: user.id
  };
  
  console.log("Adding task:", newTaskData);
  
  const { data, error } = await supabase
    .from('tasks')
    .insert([newTaskData])
    .select();
  
  if (error) {
    console.error('Error adding task:', error);
    alert('Failed to add task: ' + error.message);
  } else {
    console.log("Task added successfully:", data);
    setTasks([...data, ...tasks]);
    setNewTask('');
    setUrgency(5);
    setImportance(5);
    setEnjoyment(5);
    setTime(30);
    setIsRecurring(false);
  }
};
  
  const startEditing = (task) => {
    setEditingTask(task.id);
    setNewTask(task.text);
    setUrgency(task.urgency);
    setImportance(task.importance);
    setEnjoyment(task.enjoyment);
    setTime(task.time);
    setIsRecurring(task.is_recurring);
  };

  const updateTask = async () => {
    if (!newTask.trim() || !user) return;
    
    const updatedData = {
      text: newTask,
      urgency,
      importance,
      enjoyment,
      time,
      is_recurring: isRecurring,
    };
    
    const { error } = await supabase
      .from('tasks')
      .update(updatedData)
      .eq('id', editingTask)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error updating task:', error);
    } else {
      setTasks(tasks.map(task => 
        task.id === editingTask 
          ? { ...task, ...updatedData }
          : task
      ));
      setEditingTask(null);
      setNewTask('');
      setUrgency(5);
      setImportance(5);
      setEnjoyment(5);
      setTime(30);
      setIsRecurring(false);
    }
  };

  const cancelEditing = () => {
    setEditingTask(null);
    setNewTask('');
    setUrgency(5);
    setImportance(5);
    setEnjoyment(5);
    setTime(30);
    setIsRecurring(false);
  };
  
  const completeTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('tasks')
      .update({ 
        is_completed: true,
        completed_at: now
      })
      .eq('id', taskId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error completing task:', error);
    } else {
      const completedTask = { ...task, is_completed: true, completed_at: now };
      setCompletedTasks([completedTask, ...completedTasks]);
      setTasks(tasks.filter(t => t.id !== taskId));
      
      // If task is recurring, create a new instance for tomorrow
      if (task.is_recurring) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const newRecurringTask = {
          text: task.text,
          urgency: task.urgency,
          importance: task.importance,
          enjoyment: task.enjoyment,
          time: task.time,
          is_recurring: true,
          is_completed: false,
          user_id: user.id
        };
        
        const { data, error } = await supabase
          .from('tasks')
          .insert([newRecurringTask])
          .select();
        
        if (error) {
          console.error('Error creating recurring task:', error);
        } else {
          // The new task will appear next time tasks are fetched
        }
      }
    }
  };
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center">TaskWeave</h1>
      
      {user && (
        <div className="flex justify-end mb-4">
          <div className="text-sm text-gray-600 mr-4 pt-2">
            Signed in as: {user.email}
          </div>
          <button
            onClick={handleSignOut}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
          >
            Sign Out
          </button>
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Focus Mode</h2>
        {getNextTask() ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">{getNextTask().text}</h3>
            <div className="grid grid-cols-2 gap-2 my-4 text-sm">
              <div>Urgency: {getNextTask().urgency}/10</div>
              <div>Importance: {getNextTask().importance}/10</div>
              <div>Enjoyment: {getNextTask().enjoyment}/10</div>
              <div>Time: {getNextTask().time} min</div>
            </div>
            <button 
              onClick={() => completeTask(getNextTask().id)}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
            >
              Complete Task
            </button>
          </div>
        ) : (
          <p className="text-center text-gray-500">No tasks yet. Add one below!</p>
        )}
      </div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">
          {editingTask ? 'Edit Task' : 'Add New Task'}
        </h2>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Task Description</label>
            <input 
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter task description"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Time (minutes)</label>
            <input
              type="number"
              value={time}
              onChange={(e) => setTime(Number(e.target.value))}
              className="w-full p-2 border rounded"
              min="1"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Urgency (34% weight): {urgency}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={urgency}
              onChange={(e) => setUrgency(Number(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Importance (33% weight): {importance}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Enjoyment (33% weight): {enjoyment}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={enjoyment}
              onChange={(e) => setEnjoyment(Number(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="mr-2"
              />
              Recurring Daily Task
            </label>
          </div>
          
          <button
            onClick={editingTask ? updateTask : addTask}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            {editingTask ? 'Update Task' : 'Add Task'}
          </button>
          {editingTask && (
            <button
              onClick={cancelEditing}
              className="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">All Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-center text-gray-500">No tasks yet.</p>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <div key={task.id} className="bg-white p-4 rounded-lg shadow-md">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold">{task.text}</h3>
                    <div className="text-sm text-gray-500">
                      Score: {calculateScore(task).toFixed(1)} | Time: {task.time} min
                      {task.is_recurring && " | ↻ Recurring Daily"}
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => startEditing(task)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 py-1 px-3 rounded mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => completeTask(task.id)}
                      className="bg-green-100 hover:bg-green-200 text-green-800 py-1 px-3 rounded"
                    >
                      Complete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-4">Completed Tasks</h2>
        {completedTasks.length === 0 ? (
          <p className="text-center text-gray-500">No completed tasks yet.</p>
        ) : (
          <div className="space-y-4">
            {completedTasks.map(task => (
              <div key={task.id} className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="font-semibold">{task.text}</h3>
                <div className="text-sm text-gray-500">
                  Completed: {new Date(task.completed_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
