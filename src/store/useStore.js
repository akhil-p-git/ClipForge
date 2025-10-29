import { create } from 'zustand';

export const useStore = create((set) => ({
  // Clips in media library
  clips: [],
  
  // Clips on timeline
  timelineClips: [],
  
  // Current playback state
  playhead: 0,
  isPlaying: false,
  currentClip: null,
  
  // Trim state
  inPoint: null,
  outPoint: null,
  
  // Actions
  addClip: (clip) => set((state) => ({ 
    clips: [...state.clips, clip] 
  })),
  
  addToTimeline: (timelineClip) => set((state) => ({ 
    timelineClips: [...state.timelineClips, timelineClip] 
  })),
  
  setPlayhead: (time) => set({ playhead: time }),
  
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  
  setCurrentClip: (clip) => {
    console.log('=== SETTING CURRENT CLIP ===');
    console.log('Clip:', clip);
    set({ currentClip: clip });
    console.log('State updated');
  },
  
  updateClip: (clipId, updates) => set((state) => ({
    clips: state.clips.map(clip => 
      clip.id === clipId ? { ...clip, ...updates } : clip
    )
  })),
  
  removeClip: (clipId) => set((state) => ({
    clips: state.clips.filter(clip => clip.id !== clipId)
  })),
  
  removeTimelineClip: (timelineClipId) => set((state) => ({
    timelineClips: state.timelineClips.filter(clip => clip.id !== timelineClipId)
  })),
  
  updateTimelineClip: (clipId, updates) => set((state) => ({
    timelineClips: state.timelineClips.map(clip => 
      clip.id === clipId ? { ...clip, ...updates } : clip
    )
  })),
  
  setInPoint: (time) => set({ inPoint: time }),
  setOutPoint: (time) => set({ outPoint: time }),
  clearTrimPoints: () => set({ inPoint: null, outPoint: null }),
  clearTimelineClips: () => set({ timelineClips: [] }),
  
  // Split clip at playhead position
  splitTimelineClip: (splitTime) => set((state) => {
    const timelineClips = state.timelineClips;
    
    // Find clip at split time
    const clipToSplit = timelineClips.find(clip => {
      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + clip.duration;
      return splitTime >= clipStart && splitTime <= clipEnd;
    });
    
    if (!clipToSplit) return { timelineClips };
    
    const clipStart = clipToSplit.startTime;
    const clipDuration = clipToSplit.duration;
    const splitPosition = splitTime - clipStart;
    
    // Update existing clip to end at split point
    const leftClip = {
      ...clipToSplit,
      id: clipToSplit.id,
      duration: splitPosition,
    };
    
    // Create new clip from split point
    const rightClip = {
      id: `timeline-${Date.now()}-${Math.random()}`,
      clipId: clipToSplit.clipId,
      trackId: clipToSplit.trackId,
      startTime: splitTime,
      duration: clipDuration - splitPosition,
      trimStart: (clipToSplit.trimStart || 0) + splitPosition,
      trimEnd: clipToSplit.trimEnd || 0,
    };
    
    return {
      timelineClips: timelineClips
        .map(clip => clip.id === clipToSplit.id ? leftClip : clip)
        .concat(rightClip)
        .sort((a, b) => a.startTime - b.startTime)
    };
  }),
}));

