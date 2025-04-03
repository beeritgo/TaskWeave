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
      }
    };
    
    getUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          setUser(session.user);
          setLoading(false);
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

  // Load data from localStorage on component mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedTasks = localStorage.getItem('taskweave-tasks');
        const savedCompleted = localStorage.getItem('taskweave-completed');
        
        if (savedTasks) {
          setTasks(JSON.parse(savedTasks));
        }
        
        if (savedCompleted) {
          setCompletedTasks(JSON.parse(savedCompleted));
        }
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && tasks.length > 0) {
        localStorage.setItem('taskweave-tasks', JSON.stringify(tasks));
      }
    } catch (error) {
      console.error("Error saving tasks to localStorage:", error);
    }
  }, [tasks]);

  // Save completed tasks to localStorage whenever they change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && completedTasks.length > 0) {
        localStorage.setItem('taskweave-completed', JSON.stringify(completedTasks));
      }
    } catch (error) {
      console.error("Error saving completed tasks to localStorage:", error);
    }
  }, [completedTasks]);
  
  const calculateScore = (task) => {
    return (task.urgency * 0.34) + (task.importance * 0.33) + (task.enjoyment * 0.33);
  };
  
  const getNextTask = () => {
    if (tasks.length === 0) return null;
    return tasks.reduce((prev, current) => 
      calculateScore(current) > calculateScore(prev) ? current : prev
    );
  };
  
  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, {
        id: Date.now(),
        text: newTask,
        urgency,
        importance, 
        enjoyment,
        time,
        isRecurring
      }]);
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
    setIsRecurring(task.isRecurring);
  };

  const updateTask = () => {
    if (newTask.trim()) {
      setTasks(tasks.map(task => 
        task.id === editingTask 
          ? {
              ...task,
              text: newTask,
              urgency,
              importance,
              enjoyment,
              time,
              isRecurring
            }
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
  
  const completeTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    setCompletedTasks([
      { ...task, completedAt: new Date().toISOString() },
      ...completedTasks
    ]);
    setTasks(tasks.filter(t => t.id !== taskId));
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
  
  return
