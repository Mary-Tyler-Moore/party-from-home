import { useState, useCallback } from 'react';
import useMountEffect from '../hooks/useMountEffect/useMountEffect';
//@ts-ignore
import { createHook } from 'hookleton';
import EventEmitter from 'events';

const USER_PICTURES = ['/images/man1.jpg', '/images/man2.jpg', '/images/woman1.jpg', '/images/woman2.jpg'];

class MockDocument extends EventEmitter {
  document: any;
}

class Mocks {
  maps: Map<string, MockDocument>;
  lists: Map<string, MockDocument>;
  documents: Map<string, MockDocument>;
  participantCount: number;
  room: { id: string } | undefined;

  constructor() {
    this.maps = new Map();
    this.lists = new Map();
    this.documents = new Map();
    this.participantCount = 1;
  }
}

const useMocks = () => {
  const [mocks, setMocks] = useState(new Mocks());
  const [canvasses, setCanvasses] = useState<HTMLElement[]>([]);

  // Create offscreen canvasses for fake participant video
  useMountEffect(() => {
    const userCanvasses = [];

    for (const src of USER_PICTURES) {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 270;

      const image = new Image();
      image.src = src;

      image.onload = () => {
        const reDraw = () => {
          const ctx = canvas?.getContext('2d');
          //@ts-ignore
          ctx.drawImage(image, 0, 0, 480, 319);
        };

        setInterval(reDraw, 1000);
      };

      userCanvasses.push(canvas);
    }

    setCanvasses(userCanvasses);
  });

  const connect = useCallback(
    (_token: string) => {
      const newMocks = { ...mocks };
      newMocks.room = { id: 'mock-room' };
      setMocks(newMocks);
    },
    [mocks, setMocks]
  );

  const disconnect = useCallback(() => {
    const newMocks = { ...mocks };
    newMocks.room = undefined;
    setMocks(newMocks);
  }, [mocks]);

  const setParticipantCount = useCallback((count: number) => {
    const newMocks = { ...mocks };
    newMocks.participantCount = count;
    setMocks(newMocks);
  }, [mocks]);

  return { participantCount: mocks.participantCount, setParticipantCount, canvasses, connect, disconnect, room: mocks.room };
};

export default createHook(useMocks);
