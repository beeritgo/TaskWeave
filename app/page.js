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
    if (!newTask.trim() || !user) return;
    
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
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([newTaskData])
      .select();
    
    if (error) {
      console.error('Error adding task:', error);
    } else {
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
      console.error('Error comple
