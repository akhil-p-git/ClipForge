import React from 'react';
import { useDrag } from 'react-dnd';

function TimelineClip({ clip, sourceClip, updateClip }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'timeline-clip',
    item: { clip },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`clip-block ${clip.trackId === 1 ? 'overlay' : ''}`}
      style={{
        left: `${(clip.startTime / 60) * 100}%`,
        width: `${(clip.duration / 60) * 100}%`,
        position: 'absolute',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      <span className="clip-name">{sourceClip?.fileName || 'Clip'}</span>
    </div>
  );
}

export default TimelineClip;

