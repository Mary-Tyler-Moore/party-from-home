import React, { useState, useCallback, useEffect } from 'react';
import useMountEffect from '../../hooks/useMountEffect/useMountEffect';
import useMap from '../../hooks/useSync/useMap';
import { styled } from '@material-ui/core/styles';
import { ExpandMore, ExpandLess } from '@material-ui/icons';
import { useAppState } from '../../state';
import useRoomState from '../../hooks/useRoomState/useRoomState';
import useVideoContext from '../../hooks/useVideoContext/useVideoContext';
import RoomGridItem from './RoomGridItem';
import { rooms } from '../../rooms';

interface ContainerProps {
  open: boolean;
}

const Container = styled('div')((props: ContainerProps) => ({
  display: 'flex',
  flexShrink: 0,
  flexDirection: 'column',
  backgroundColor: '#1F1F1F',
  height: props.open ? '374px' : '70px',
  paddingLeft: '32px',
}));

const HeaderContainer = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  marginTop: 0,
  cursor: 'pointer',
  padding: '21px',
});

const ContainerTitle = styled('p')({
  margin: 0,
  color: '#E0E0E0',
  fontSize: '24px',
  fontWeight: 600,
  lineHeight: '29px',
  alignItems: 'center',
});

const ItemContainer = styled('div')({
  display: 'flex',
  flexWrap: 'nowrap',
  overflowX: 'auto',
  flex: 1,
});

export interface Participant {
  uid: string;
  displayName: string | undefined;
  photoURL: string | undefined;
}

interface Participants {
  [key: string]: Participant[];
}

const HEARTBEAT_INTERVAL = 100000;

// todo(carlos): probably should be somewhere else, higher level,
// after we implement the auth flow
const heartbeat = (identity: string) => {
  return () => {
    fetch(`/api/heartbeat?identity=${identity}`).then(() => {
      console.log('Sent heartbeat');
    });
  };
};

interface HeaderProps {
  onClick: () => void;
  open: boolean;
}

const Header = (props: HeaderProps) => {
  return (
    <HeaderContainer onClick={props.onClick}>
      <ContainerTitle>Party Rooms</ContainerTitle>
      {props.open ? <ExpandMore fontSize="large" /> : <ExpandLess fontSize="large" />}
    </HeaderContainer>
  );
};

export default function RoomGrid() {
  const { getToken, user } = useAppState();
  const { connect, room } = useVideoContext();
  const roomState = useRoomState();
  const [participants, setParticipants] = useState({} as Participants);
  const [open, setOpen] = useState(false);

  const onSelectRoom = (id: string) => {
    if (roomState !== 'disconnected') room.disconnect();
    getToken(user?.uid || '', id).then(token => connect(token));
  };

  const onUserAdded = useCallback(
    (args: any) => {
      const value = args.item.value;
      const roomParticipants = { ...participants };

      if (value.room !== undefined) {
        const par = {
          uid: value.identity,
          displayName: value.displayName,
          photoURL: value.photoURL,
        };

        if (roomParticipants[value.room] !== undefined) {
          roomParticipants[value.room].push(par);
        } else {
          roomParticipants[value.room] = [par];
        }

        setParticipants(roomParticipants);
      }
    },
    [participants]
  );

  const onUserRemoved = useCallback(
    (args: any) => {
      const value = args.item.value;
      const roomParticipants = { ...participants };

      if (value.room !== undefined) {
        if (roomParticipants[value.room] !== undefined) {
          const roomUsers = roomParticipants[value.room];
          roomParticipants[value.room] = roomUsers.filter(u => u.uid !== value.identity);
        }

        setParticipants(roomParticipants);
      }
    },
    [participants]
  );

  const onUserUpdated = useCallback(
    (args: any) => {
      const value = args.item.value;
      const roomParticipants = { ...participants };

      if (value.room !== undefined) {
        const par = {
          uid: value.identity,
          displayName: value.displayName,
          photoURL: value.photoURL,
        };

        for (const roomName in roomParticipants) {
          const roomUsers = roomParticipants[roomName];
          roomParticipants[roomName] = roomUsers.filter(u => u.uid !== value.identity);
        }

        if (roomParticipants.hasOwnProperty(value.room)) {
          roomParticipants[value.room].push(par);
        } else {
          roomParticipants[value.room] = [par];
        }

        setParticipants(roomParticipants);
      }
    },
    [participants]
  );

  const { map } = useMap('users', {
    onAdded: onUserAdded,
    onRemoved: onUserRemoved,
    onUpdated: onUserUpdated,
  });

  // todo(carlos): move this to app state
  useMountEffect(() => {
    setInterval(heartbeat(user?.uid || ''), HEARTBEAT_INTERVAL);
  });

  useEffect(() => {
    map?.getItems().then((paginator: any) => {
      const roomParticipants: Participants = {};

      paginator.items.forEach((item: any) => {
        if (item.value.room !== undefined) {
          if (roomParticipants[item.value.room] !== undefined) {
            roomParticipants[item.value.room].push(item.value.identity);
          } else {
            roomParticipants[item.value.room] = [item.value.identity];
          }
        }
      });

      setParticipants(roomParticipants);
    });
  }, [map]);

  return (
    <Container open={open}>
      <Header onClick={() => setOpen(!open)} open={open} />
      <ItemContainer>
        {rooms.map(rm => (
          <RoomGridItem
            key={rm.id}
            id={rm.id}
            title={rm.name}
            participants={participants[rm.id] || []}
            onClick={onSelectRoom}
          />
        ))}
      </ItemContainer>
    </Container>
  );
}
