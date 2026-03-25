"use client";

import { useState, useEffect, useCallback } from "react";
import { PoolStatus, ScheduleEvent } from "@/lib/types";

const POLL_INTERVAL = 10000; // 10 seconds

export function usePoolStatus() {
  const [status, setStatus] = useState<PoolStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/pool/status");
      if (!res.ok) throw new Error("Failed to fetch pool status");
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const toggleCircuit = async (circuitId: number, state: boolean) => {
    try {
      const res = await fetch("/api/pool/circuits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circuitId, state }),
      });
      if (!res.ok) throw new Error("Failed to toggle circuit");

      // Optimistic update
      if (status) {
        setStatus({
          ...status,
          circuits: status.circuits.map((c) =>
            c.id === circuitId ? { ...c, state } : c
          ),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      fetchStatus(); // Revert on error
    }
  };

  const updateTemperature = async (
    bodyId: number,
    updates: { heatMode?: number; setPoint?: number }
  ) => {
    try {
      const res = await fetch("/api/pool/temperature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyId, ...updates }),
      });
      if (!res.ok) throw new Error("Failed to update temperature");
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return { status, loading, error, toggleCircuit, updateTemperature, refresh: fetchStatus };
}

export function useSchedules() {
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/pool/schedules");
      if (!res.ok) throw new Error("Failed to fetch schedules");
      const data = await res.json();
      setSchedules(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  return { schedules, loading, error, refresh: fetchSchedules };
}
