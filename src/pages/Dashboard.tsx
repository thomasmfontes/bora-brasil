import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FiCheckCircle, FiTrash2, FiX, FiEdit, FiPlus, FiMinus, FiClock, FiChevronDown } from 'react-icons/fi';
import { MdOutlineMeetingRoom } from "react-icons/md";
import { RxCalendar } from "react-icons/rx";
import { TfiEmail } from "react-icons/tfi";




import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';


const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [userAccess, setUserAccess] = useState<string[]>([]);
  const [roomDates, setRoomDates] = useState<{[key: string]: string}>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isBookingConfirmOpen, setIsBookingConfirmOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);

  // Componente CustomSelect Interno
  const CustomSelect = ({ options, value, onChange, placeholder }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find((o: any) => o.value === value);

    return (
      <div className={`custom-select-container ${isOpen ? 'open' : ''}`} ref={containerRef}>
        <div className="custom-select-trigger" onClick={() => setIsOpen(!isOpen)}>
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
          <FiChevronDown className="custom-select-arrow" />
        </div>
        {isOpen && (
          <div className="custom-select-list">
            {options.map((opt: any) => (
              <div
                key={opt.value}
                className={`custom-select-item ${opt.value === value ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}`}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedProfileForEdit, setSelectedProfileForEdit] = useState<any>(null);

  const [participants, setParticipants] = useState([
    { id_participant: '', client: '', name: '', email: '', phone: '' },
    { id_participant: '', client: '', name: '', email: '', phone: '' },
    { id_participant: '', client: '', name: '', email: '', phone: '' },
    { id_participant: '', client: '', name: '', email: '', phone: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ nm_profile: '', email: '', password: '', ds_role: 'USER' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedUserAccess, setSelectedUserAccess] = useState<string[]>([]);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [bookingToEdit, setBookingToEdit] = useState<any>(null);
  const [tempDate, setTempDate] = useState('');
  const [tempTime, setTempTime] = useState('');




  const eventDates = ['2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21'];
  const timeSlots = [
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ];


  useEffect(() => {
    if (isModalOpen || isEditModalOpen || isAdminModalOpen || isNewUserModalOpen || isConfirmModalOpen || isBookingConfirmOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, isEditModalOpen, isAdminModalOpen, isNewUserModalOpen, isConfirmModalOpen, isBookingConfirmOpen]);


  useEffect(() => {
    fetchInitialData();
  }, [profile]);

  const fetchInitialData = async () => {
    try {
      const [roomsRes, bookingsRes] = await Promise.all([
        supabase.from('t_rooms').select('*').order('nm_room', { ascending: true }),
        supabase.from('t_bookings').select('*').in('dt_booking', eventDates)
      ]);
      if (roomsRes.data) {
        const customOrder = ['bora', 'skala', 'lola'];
        const sorted = [...roomsRes.data].sort((a, b) => {
          const idxA = customOrder.findIndex(o => a.nm_room.toLowerCase().includes(o));
          const idxB = customOrder.findIndex(o => b.nm_room.toLowerCase().includes(o));
          return idxA - idxB;
        });
        setRooms(sorted);
      }
      if (bookingsRes.data) setBookings(bookingsRes.data);
      if (profile) {
        const { data: acc } = await supabase.from('t_user_room_access').select('id_room').eq('id_profile', profile.id_profile);
        if (acc) setUserAccess(acc.map(a => a.id_room));
        if (profile.ds_role === 'ADMIN') {
          const { data: profs } = await supabase.from('t_profiles').select('*');
          if (profs) setAllProfiles(profs);
        }
      }
    } catch (e) { console.error(e); }
  };



  const hasAccess = (roomId: string) => profile?.ds_role === 'ADMIN' || userAccess.includes(roomId);
  const getSlotStatus = (roomId: string, time: string, date: string) => {
    const b = bookings.find(x => x.id_room === roomId && x.hr_time_slot === time && x.dt_booking === date);
    if (!b) return 'available';
    return b.id_profile === profile?.id_profile ? 'mine' : 'occupied';
  };

  const updateParticipant = (index: number, field: string, value: string) => {
    const newParticipants = [...participants];
    (newParticipants[index] as any)[field] = value;
    setParticipants(newParticipants);
  };

  const handleBooking = async () => {
    if (!selectedRoom || !profile) return;
    
    const currentRoomDate = tempDate;
    const selectedSlot = tempTime;

    
    // Regra: Limite de 3 agendamentos por dia (ADMIN isento)
    if (profile.ds_role !== 'ADMIN') {
      const userDayBookings = bookings.filter(b => b.id_profile === profile.id_profile && b.dt_booking === currentRoomDate);
      if (userDayBookings.length >= 3) {
        toast.error('Você já atingiu o limite de 3 agendamentos para este dia.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (bookingToEdit) {
        // MODO EDIÇÃO
        const { data: bUpdData, error: bErr } = await supabase.from('t_bookings').update({
          id_room: selectedRoom.id_room, 
          dt_booking: currentRoomDate, 
          hr_time_slot: selectedSlot
        })
        .eq('id_booking', bookingToEdit.id_booking)
        .select('*');
        
        if (bErr) throw bErr;
        if (!bUpdData || bUpdData.length === 0) throw new Error('Atualização da reserva bloqueada pelo banco de dados (Políticas RLS).');

        
        // Estratégia resiliente a RLS (Row Level Security):
        // 1. Inserir apenas participantes estritamente novos
        const newParts = participants
          .filter(p => p.name.trim() !== '' && !p.id_participant)
          .map(p => ({
            id_booking: bookingToEdit.id_booking, 
            nm_participant: p.name.trim(), 
            nm_client: p.client, // Salvando Cliente
            ds_email: p.email, 
            nu_phone: p.phone
          }));
        if (newParts.length > 0) {
          await supabase.from('t_booking_participants').insert(newParts);
        }

        // 2. Atualizar os participantes existentes (evita duplicar)
        const existingParts = participants.filter(p => p.name.trim() !== '' && p.id_participant);
        for (const p of existingParts) {
           const { data, error: updErr } = await supabase.from('t_booking_participants')
             .update({
               nm_participant: p.name.trim(), 
               nm_client: p.client, // Atualizando Cliente
               ds_email: p.email, 
               nu_phone: p.phone
             })
             .eq('id_participant', p.id_participant)
             .select('*'); 
             
           if (updErr) throw new Error('Erro ao atualizar participante: ' + updErr.message);
           if (!data || data.length === 0) throw new Error('Atualização bloqueada pelo banco de dados (Políticas RLS).');
        }

        // 3. Remover (ou esvaziar) participantes que o usuário apagou no modal
        const partsToClear = participants.filter(p => p.name.trim() === '' && p.id_participant);
        if (partsToClear.length > 0) {
           const ids = partsToClear.map(p => p.id_participant);
           // Tenta deletar fisicamente
           await supabase.from('t_booking_participants').delete().in('id_participant', ids);
           // Fallback: se o RLS bloqueou o delete silenciosamente, apagamos o nome para que suma da UI
           for (const p of partsToClear) {
              await supabase.from('t_booking_participants').update({ nm_participant: '', ds_email: '', nu_phone: '' }).eq('id_participant', p.id_participant);
           }
        }


        
        toast.success('Agendamento atualizado!');
      } else {
        // MODO CRIAÇÃO
        const { data: bData, error: bErr } = await supabase.from('t_bookings').insert({
          id_room: selectedRoom.id_room, 
          id_profile: profile.id_profile, 
          dt_booking: currentRoomDate, 
          hr_time_slot: selectedSlot
        }).select().single();

        if (bErr) throw bErr;

        const validParts = participants.filter(p => p.name.trim() !== '').map(p => ({
          id_booking: bData.id_booking, 
          nm_participant: p.name, 
          nm_client: p.client, // Salvando Cliente na criação
          ds_email: p.email, 
          nu_phone: p.phone
        }));

        if (validParts.length > 0) {
          const { error: insErr } = await supabase.from('t_booking_participants').insert(validParts);
          if (insErr) throw insErr;
        }
        toast.success('Agendamento realizado!');
      }


      await fetchInitialData();
      setIsModalOpen(false);
      setIsEditModalOpen(false);
      setBookingToEdit(null);



      setParticipants([
        { id_participant: '', client: '', name: '', email: '', phone: '' },
        { id_participant: '', client: '', name: '', email: '', phone: '' },
        { id_participant: '', client: '', name: '', email: '', phone: '' },
        { id_participant: '', client: '', name: '', email: '', phone: '' }
      ]);

    } catch (e: any) { 
      toast.error('Erro ao agendar: ' + e.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const openEditModal = async (booking: any) => {
    const room = rooms.find(r => r.id_room === booking.id_room);
    if (!room) return;
    
    setSelectedRoom(room);
    setTempTime(booking.hr_time_slot);
    setTempDate(booking.dt_booking);

    setBookingToEdit(booking);

    // Reset participants before loading new ones

    setParticipants([
      { id_participant: '', client: '', name: '', email: '', phone: '' },
      { id_participant: '', client: '', name: '', email: '', phone: '' },
      { id_participant: '', client: '', name: '', email: '', phone: '' },
      { id_participant: '', client: '', name: '', email: '', phone: '' }
    ]);
    
    const { data: parts } = await supabase.from('t_booking_participants').select('*').eq('id_booking', booking.id_booking);

    if (parts) {
      const formattedParts = [0, 1, 2, 3].map(i => {
        if (parts[i]) {
          return { 
            id_participant: parts[i].id_participant, 
            client: parts[i].nm_client || '', // Carregando Cliente
            name: parts[i].nm_participant, 
            email: parts[i].ds_email || '', 
            phone: parts[i].nu_phone || '' 
          };
        }
        return { id_participant: '', client: '', name: '', email: '', phone: '' };
      });
      setParticipants(formattedParts);
    }
    setIsEditModalOpen(true);
  };


  const handleDelete = (id: string) => {
    setBookingToDelete(id);
    setIsBookingConfirmOpen(true);
  };

  const handleConfirmDeleteBooking = async () => {
    if (!bookingToDelete) return;
    try {
      const { error } = await supabase.from('t_bookings').delete().eq('id_booking', bookingToDelete);
      if (error) throw error;
      
      toast.success('Reserva excluída com sucesso.');
      setIsBookingConfirmOpen(false);
      setIsEditModalOpen(false);
      setBookingToDelete(null);
      await fetchInitialData();
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.nm_profile || !newUserForm.email || !newUserForm.password) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setIsCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: newUserForm,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('Usuário criado com sucesso!');
      setIsNewUserModalOpen(false);
      setNewUserForm({ nm_profile: '', email: '', password: '', ds_role: 'USER' });
      await fetchInitialData();
    } catch (e: any) {
      toast.error('Erro ao criar usuário: ' + e.message);
    } finally {
      setIsCreatingUser(false);
    }
  };
  const handleDeleteUser = async () => {
    console.log('CHAMANDO RPC delete_user_complete para:', userToDelete);
    if (!userToDelete) {
      toast.error('Nenhum usuário selecionado.');
      return;
    }

    try {
      // Chamamos a função SQL que criamos (Opção Nuclear)
      const { error } = await supabase.rpc('delete_user_complete', { 
        target_id: userToDelete 
      });

      if (error) throw error;

      toast.success('Usuário excluído com sucesso!');
      setIsConfirmModalOpen(false);
      setUserToDelete(null);
      await fetchInitialData();
    } catch (e: any) {
      console.error('ERRO NA EXCLUSÃO VIA RPC:', e);
      toast.error('Erro ao excluir: ' + (e.message || 'Erro desconhecido'));
    }
  };

  const confirmDeleteUser = (id: string) => {
    console.log('CLIQUE NO ÍCONE DE APAGAR. ID:', id);
    setUserToDelete(id);
    setIsConfirmModalOpen(true);
  };


  const openAdminModal = async (p: any) => {
    setSelectedProfileForEdit(p);
    const { data: acc } = await supabase.from('t_user_room_access').select('id_room').eq('id_profile', p.id_profile);
    if (acc) setSelectedUserAccess(acc.map(a => a.id_room));
    setIsAdminModalOpen(true);
  };
  return (
    <>
      <div className="dashboard-container">
      <header className="main-header">
        <div className="header-logos">
          <div className="logo-bora">Bora<br/><span style={{fontSize: '1.5rem', display: 'block', marginTop: '-15px'}}>BRASIL</span></div>
          <div className="header-divider"></div>
          <div className="logo-skala">SKALA<span>BRASIL</span><br/><div style={{border: '2px solid white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', marginTop: '5px'}}>lola</div></div>
        </div>
        <div className="event-tag">APAS 2026!</div>
      </header>

      <main className="main-portal-card">
        <div className="portal-title-block">
          <h2><RxCalendar /> Portal de Agendamentos de Salas</h2>
          <p className="portal-welcome">
            <strong>Bem-vindo ao portal de agendamento de salas de reunião – APAS</strong><br/>
            Este é o canal oficial para reserva das salas de reunião do Grupo Bora Brasil, Skala Brasil e Lola From Rio durante a APAS. Aqui você pode consultar a disponibilidade e garantir seu horário de forma rápida e prática.
          </p>
        </div>

        <div className="rooms-grid">
          {rooms.map((room) => {
            const access = hasAccess(room.id_room);
            const name = room.nm_room.toLowerCase();
            const theme = name.includes('bora') ? 'bora' : name.includes('skala') ? 'skala' : name.includes('lola') ? 'lola' : 'bora';
            const imageUrl = name.includes('bora') 
              ? "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=600"
              : name.includes('skala')
                ? "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=600"
                : "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=600";
            
            return (
              <div key={room.id_room} className={`room-card ${theme}`} style={{opacity: access ? 1 : 0.7}}>
                <div className={`room-header ${theme}`}>
                  <span className="header-dot">●</span> {room.nm_room}
                </div>
                <img className="room-image" src={imageUrl} alt={room.nm_room} />
                
                <div className="room-spreadsheet-container">
                  <div className="date-tabs">
                    {eventDates.map(d => {
                      const currentRoomDate = roomDates[room.id_room] || eventDates[0];
                      return (
                        <button 
                          key={d} 
                          className={`date-tab ${currentRoomDate === d ? 'active' : ''}`} 
                          onClick={() => setRoomDates(prev => ({ ...prev, [room.id_room]: d }))}
                        >
                          {d.split('-')[2]}/{d.split('-')[1]}
                        </button>
                      );
                    })}
                  </div>

                  <div className="slots-container">
                    {timeSlots.filter(t => {
                      const currentRoomDate = roomDates[room.id_room] || eventDates[0];
                      if (currentRoomDate === '2026-05-21') {
                        return parseInt(t.split(':')[0]) <= 17;
                      }
                      return true;
                    }).map(t => {
                      const currentRoomDate = roomDates[room.id_room] || eventDates[0];
                      const status = getSlotStatus(room.id_room, t, currentRoomDate);
                      return (
                        <div key={t} className="slot-row">
                          <span className={`slot-time ${status}`}>{t}</span>
                          <button 
                            className={`slot-btn ${status}`}
                            disabled={status === 'occupied' || !access}
                            onClick={() => {
                              if (status === 'available') {
                                setSelectedRoom(room);
                                setTempTime(t);
                                setTempDate(currentRoomDate);
                                setParticipants([
                                  { id_participant: '', client: '', name: '', email: '', phone: '' },
                                  { id_participant: '', client: '', name: '', email: '', phone: '' },
                                  { id_participant: '', client: '', name: '', email: '', phone: '' },
                                  { id_participant: '', client: '', name: '', email: '', phone: '' }
                                ]);
                                setIsModalOpen(true);


                              } else if (status === 'mine') {
                                const b = bookings.find(x => x.id_room === room.id_room && x.hr_time_slot === t && x.dt_booking === currentRoomDate);
                                if (b) openEditModal(b);

                              }
                            }}
                          >
                            {status === 'available' ? <FiPlus /> : status === 'mine' ? <FiMinus /> : ''}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="portal-instructions-footer">
          <div className="instructions-list">
            <div className="instruction-item">
              <RxCalendar className="icon-cal" />
              <p>Selecione a data e o período desejado.</p>
            </div>

            <div className="instruction-item">
              <MdOutlineMeetingRoom className="icon-room" />
              <p>Escolha a sala disponível.</p>
            </div>

            <div className="instruction-item">
              <TfiEmail className="icon-mail" />
              <p>
                Confirme sua reserva em poucos cliques.<br/>
                Em caso de dúvidas ou necessidade de suporte, procure nossa equipe no local. Agradecemos sua organização e desejamos ótimos encontros!
              </p>
            </div>
            <div className="instruction-item">
              <TfiEmail className="icon-mail" />
              <p>Após agendar, tanto o solicitante quanto o convidado receberão um e-mail de confirmação.</p>
            </div>

          </div>

          <div className="footer-brand-area">
            <div className="brand-bora">
              <span className="bora-text">Bora</span>
              <span className="brasil-text">BRASIL</span>
              <span className="apas-text">APAS 2026!</span>
            </div>
            <div className="brand-divider"></div>
            <div className="brand-secondary">
              <div className="logo-skala-small">SKALA<span>BRASIL</span></div>
              <div className="logo-lola-circle">lola</div>
            </div>
          </div>
        </footer>
      </main>


      <section className="section-card">
        <h2 className="section-title">Agendamentos</h2>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Horário</th><th>Sala</th><th>Nome</th><th>Status</th><th>Ações</th></tr></thead>


            <tbody>
              {bookings
                .filter(b => profile?.ds_role === 'ADMIN' || b.id_profile === profile?.id_profile)
                .map(b => (
                <tr key={b.id_booking}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1F4D29' }}>{b.hr_time_slot}</div>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>
                      {b.dt_booking ? `${b.dt_booking.split('-')[2]}/${b.dt_booking.split('-')[1]}` : ''}
                    </div>
                  </td>

                  <td>{rooms.find(r => r.id_room === b.id_room)?.nm_room}</td>
                  <td>{allProfiles.find(p => p.id_profile === b.id_profile)?.nm_profile || 'Participante'}</td>
                  <td className="status-agendado">Agendado</td>
                  <td>

                    <div className="action-icons">
                      {(profile?.ds_role === 'ADMIN' || b.id_profile === profile?.id_profile) && (
                        <>
                          <FiEdit className="icon-edit" onClick={() => openEditModal(b)} />
                          <div className="icon-delete" onClick={() => handleDelete(b.id_booking)}><FiX /></div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>

              ))}
            </tbody>
          </table>
        </div>
      </section>

      {profile?.ds_role === 'ADMIN' && (
        <section className="users-section">
          <div className="users-header">
            <h2 className="users-title">Gestão de Usuários</h2>
            <button className="btn-new-user" onClick={() => setIsNewUserModalOpen(true)}>
              <FiPlus /> <span className="btn-text">Novo Usuário</span>
            </button>
          </div>
          
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Login</th>
                  <th>E-mail</th>
                  <th>Grupo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {allProfiles.map((p) => {
                  const realEmail = p.ds_email || '—';
                  const login = p.ds_email ? p.ds_email.split('@')[0] : '—';
                  return (
                    <tr key={p.id_profile}>
                      <td>{p.nm_profile}</td>
                      <td>{login}</td>
                      <td>{realEmail}</td>
                      <td>{p.ds_role === 'ADMIN' ? 'Administrador' : 'Usuário'}</td>
                      <td>
                        <div className="action-icons">
                          <FiEdit className="icon-edit" onClick={() => openAdminModal(p)} />
                          <div className="icon-delete" onClick={() => confirmDeleteUser(p.id_profile)}><FiX /></div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="table-pagination">
                <div className="pagination-pill">
                <span>Anterior</span>
                <span className="page-active">1</span>
                <span>Próximo</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {isModalOpen && selectedRoom && (
        <div className="modal-overlay modal-booking">
          <div className="modal-content">
            <div className="modal-top-title">
              <RxCalendar /> Portal de Agendamentos de Salas
            </div>

            <div className="modal-inner-container">
              <div className={`unified-header ${selectedRoom.nm_room.toLowerCase().includes('skala') ? 'skala' : selectedRoom.nm_room.toLowerCase().includes('bora') ? 'bora' : 'lola'}`}>
                <span className="header-dot">●</span> {selectedRoom.nm_room}
              </div>
              
              <img src={selectedRoom.nm_room.toLowerCase().includes('skala') ? "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600" : (rooms.indexOf(selectedRoom) === 0 ? "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600" : "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600")} style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
              
              <div className="modal-info-bar premium" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
                  <div className="info-row">
                    <span>Agendamento para:</span>
                    <strong>{tempDate.split('-')[2]} de maio de 2026</strong>
                  </div>
                  
                  <div className="info-row">
                    <span>Horário:</span>
                    <strong>Das {tempTime} até as {
                      (() => {
                        const [h, m] = tempTime.split(':').map(Number);
                        const totalMin = (h || 0) * 60 + (m || 0) + 60;
                        const newH = Math.floor(totalMin / 60);
                        const newM = totalMin % 60;
                        return `${newH}:${newM === 0 ? '00' : newM}`;
                      })()
                    }</strong>
                  </div>
                </div>
              </div>


              <div className="participant-table-wrapper">
                <table className="participant-table">
                  <thead><tr><th colSpan={2}>Participantes</th></tr></thead>
                  <tbody>
                    {participants.map((p, i) => (
                      <tr key={i}>
                        <td className="participant-row-green"><FiPlus /></td>
                        <td>
                          <div className="participant-input-row top">
                            <div className="participant-input-col" style={{ flex: '1' }}>
                              <input 
                                className="participant-input"
                                placeholder="Cliente" 
                                value={p.client} 
                                onChange={e => updateParticipant(i, 'client', e.target.value)} 
                              />
                            </div>
                          </div>
                          <div className="participant-input-row">
                            <div className="participant-input-col">
                              <input className="participant-input" placeholder="Nome" value={p.name} onChange={e => updateParticipant(i, 'name', e.target.value)} />
                            </div>
                            <div className="participant-input-col">
                              <input className="participant-input" placeholder="E-mail" value={p.email} onChange={e => updateParticipant(i, 'email', e.target.value)} />
                            </div>
                            <div className="participant-input-col">
                              <input className="participant-input" placeholder="Telefone (ddd)" value={p.phone} onChange={e => updateParticipant(i, 'phone', e.target.value)} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer-msg">
              <TfiEmail /> Após agendar, tanto o solicitante quanto o convidado receberão um e-mail de confirmação.
            </div>
            
            <div className="modal-buttons">
              <button className="btn-confirm" onClick={handleBooking} disabled={isSubmitting || !participants[0].name}>
                {isSubmitting ? <><div className="spinner"></div> AGENDANDO...</> : 'AGENDAR SALA'}
              </button>
              <button className="btn-cancel" onClick={() => {
                setIsModalOpen(false);
                setBookingToEdit(null);
                setParticipants([
                  { id_participant: '', client: '', name: '', email: '', phone: '' },
                  { id_participant: '', client: '', name: '', email: '', phone: '' },
                  { id_participant: '', client: '', name: '', email: '', phone: '' },
                  { id_participant: '', client: '', name: '', email: '', phone: '' }
                ]);
              }}>CANCELAR</button>


            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedRoom && bookingToEdit && (
        <div className="modal-overlay modal-booking">
          <div className="modal-content">
            <div className="modal-top-title">
              <RxCalendar /> Gerenciar Agendamento
            </div>

            <div className="modal-inner-container">
              <div className={`unified-header ${selectedRoom.nm_room.toLowerCase().includes('skala') ? 'skala' : selectedRoom.nm_room.toLowerCase().includes('bora') ? 'bora' : 'lola'}`}>
                <span className="header-dot">●</span> {selectedRoom.nm_room}
              </div>
              
              <img src={selectedRoom.nm_room.toLowerCase().includes('skala') ? "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600" : (rooms.indexOf(selectedRoom) === 0 ? "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600" : "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600")} style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
              
              <div className="modal-info-bar premium">
                <div className="modal-edit-grid">
                  <div className="edit-input-wrapper">
                    <label className="edit-input-label"><MdOutlineMeetingRoom /> SALA SELECIONADA</label>
                    <CustomSelect 
                      options={rooms.map(r => {
                        const isOccupied = bookings.some(b => 
                          b.id_room === r.id_room && 
                          b.dt_booking === tempDate && 
                          b.hr_time_slot === tempTime && 
                          b.id_booking !== bookingToEdit.id_booking
                        );
                        return { 
                          value: r.id_room, 
                          label: isOccupied ? `${r.nm_room} (Ocupada neste horário)` : r.nm_room,
                          disabled: isOccupied
                        };
                      })}
                      value={bookingToEdit.id_room}
                      onChange={(val: string) => {
                        const r = rooms.find(room => room.id_room === val);
                        if (r) setBookingToEdit({ ...bookingToEdit, id_room: val });
                      }}
                    />
                  </div>

                  <div className="edit-input-wrapper">
                    <label className="edit-input-label"><RxCalendar /> DATA</label>
                    <CustomSelect 
                      options={eventDates.map(d => ({ value: d, label: `${d.split('-')[2]} de maio de 2026` }))}
                      value={tempDate}
                      onChange={(val: string) => setTempDate(val)}
                    />
                  </div>

                  <div className="edit-input-wrapper">
                    <label className="edit-input-label"><FiClock /> HORÁRIO</label>
                    <CustomSelect 
                      options={timeSlots.filter(t => {
                        if (tempDate === '2026-05-21') return parseInt(t.split(':')[0]) <= 17;
                        return true;
                      }).map(t => {
                        const isOccupied = bookings.some(b => 
                          b.id_room === bookingToEdit.id_room && 
                          b.dt_booking === tempDate && 
                          b.hr_time_slot === t && 
                          b.id_booking !== bookingToEdit.id_booking
                        );
                        return { 
                          value: t, 
                          label: isOccupied ? `${t} (Ocupado)` : t,
                          disabled: isOccupied
                        };
                      })}
                      value={tempTime}
                      onChange={(val: string) => setTempTime(val)}
                    />
                  </div>
                </div>
              </div>

              <div className="participant-table-wrapper">
                <table className="participant-table">
                  <thead><tr><th colSpan={2}>Participantes</th></tr></thead>
                  <tbody>
                    {participants.map((p, i) => (
                      <tr key={i}>
                        <td className="participant-row-green"><FiPlus /></td>
                        <td>
                          <div className="participant-input-row top">
                            <div className="participant-input-col" style={{ flex: '1' }}>
                              <input 
                                className="participant-input"
                                placeholder="Cliente" 
                                value={p.client} 
                                onChange={e => updateParticipant(i, 'client', e.target.value)} 
                              />
                            </div>
                          </div>
                          <div className="participant-input-row">
                            <div className="participant-input-col">
                              <input className="participant-input" placeholder="Nome" value={p.name} onChange={e => updateParticipant(i, 'name', e.target.value)} />
                            </div>
                            <div className="participant-input-col">
                              <input className="participant-input" placeholder="E-mail" value={p.email} onChange={e => updateParticipant(i, 'email', e.target.value)} />
                            </div>
                            <div className="participant-input-col">
                              <input className="participant-input" placeholder="Telefone (ddd)" value={p.phone} onChange={e => updateParticipant(i, 'phone', e.target.value)} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-buttons" style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
              <button className="btn-confirm" onClick={handleBooking} disabled={isSubmitting || !participants[0].name} style={{ flex: 2 }}>
                {isSubmitting ? <><div className="spinner"></div> ATUALIZANDO...</> : <><FiCheckCircle style={{ fontSize: '1.2rem' }} /> SALVAR ALTERAÇÕES</>}
              </button>
              
              <button 
                className="btn-cancel" 
                style={{ background: '#fff', color: '#d32f2f', borderColor: '#ffcdd2', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }} 
                onClick={() => handleDelete(bookingToEdit.id_booking)}
              >
                <FiTrash2 /> EXCLUIR
              </button>

              <button className="btn-cancel" onClick={() => {
                setIsEditModalOpen(false);
                setBookingToEdit(null);
                setParticipants([
                  { id_participant: '', client: '', name: '', email: '', phone: '' },
                  { id_participant: '', client: '', name: '', email: '', phone: '' },
                  { id_participant: '', client: '', name: '', email: '', phone: '' },
                  { id_participant: '', client: '', name: '', email: '', phone: '' }
                ]);
              }}>
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}


      {isAdminModalOpen && selectedProfileForEdit && (
        <div className="modal-overlay modal-permissions">
          <div className="modal-content" style={{ maxWidth: '460px', padding: 0, overflow: 'hidden' }}>
            <div className="unified-header bora" style={{ margin: 0, borderRadius: 0, height: '70px' }}>
              <span className="header-dot">●</span> Permissões: {selectedProfileForEdit.nm_profile}
            </div>
             
            <div className="modal-body" style={{ padding: '2.5rem 2rem' }}>
               <div className="permission-list">
                  {rooms.map(r => (
                    <label key={r.id_room} className="permission-item">
                      <input 
                        type="checkbox" 
                        checked={selectedUserAccess.includes(r.id_room)} 
                        onChange={async (e) => {
                          const isChecked = e.target.checked;
                          if (isChecked) {
                            setSelectedUserAccess(prev => [...prev, r.id_room]);
                            const { error } = await supabase.from('t_user_room_access').insert({ 
                              id_profile: selectedProfileForEdit.id_profile, 
                              id_room: r.id_room 
                            });
                            if (error) {
                              setSelectedUserAccess(prev => prev.filter(id => id !== r.id_room));
                              toast.error('Erro ao adicionar permissão');
                            } else {
                              toast.success(`Acesso à ${r.nm_room} liberado`);
                            }
                          } else {
                            setSelectedUserAccess(prev => prev.filter(id => id !== r.id_room));
                            const { error } = await supabase.from('t_user_room_access')
                              .delete()
                              .eq('id_profile', selectedProfileForEdit.id_profile)
                              .eq('id_room', r.id_room);
                            if (error) {
                              setSelectedUserAccess(prev => [...prev, r.id_room]);
                              toast.error('Erro ao remover permissão');
                            } else {
                              toast.success(`Acesso à ${r.nm_room} removido`);
                            }
                          }
                          await fetchInitialData();
                        }} 
                      />
                      <span className="permission-label">{r.nm_room}</span>
                    </label>
                  ))}
               </div>

               <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                  <button className="btn-confirm" style={{width: '100%'}} onClick={() => { setIsAdminModalOpen(false); setSelectedUserAccess([]); }}>
                    CONCLUIR
                  </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {isNewUserModalOpen && (
        <div className="modal-overlay modal-new-user">
          <div className="modal-content" style={{ maxWidth: '460px', padding: 0, overflow: 'hidden' }}>
            <div className="unified-header bora" style={{ margin: 0, borderRadius: 0, height: '70px' }}>
              <span className="header-dot">●</span> Novo Usuário
            </div>
            <div className="modal-body" style={{ padding: '2.5rem 2rem' }}>
              <div className="admin-input-group">
                <label className="admin-label">Nome Completo *</label>
                <input 
                  className="admin-input"
                  placeholder="Nome do usuário" 
                  value={newUserForm.nm_profile} 
                  onChange={e => setNewUserForm({ ...newUserForm, nm_profile: e.target.value })} 
                />
              </div>

              <div className="admin-input-group">
                <label className="admin-label">E-mail *</label>
                <input 
                  className="admin-input"
                  type="email"
                  placeholder="email@exemplo.com" 
                  value={newUserForm.email} 
                  onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })} 
                />
              </div>

              <div className="admin-input-group">
                <label className="admin-label">Senha *</label>
                <input 
                  className="admin-input"
                  type="password"
                  placeholder="••••••" 
                  value={newUserForm.password} 
                  onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })} 
                />
              </div>

              <div className="admin-input-group">
                <label className="admin-label">Grupo</label>
                <CustomSelect 
                  options={[
                    { value: 'USER', label: 'Usuário' },
                    { value: 'ADMIN', label: 'Administrador' }
                  ]}
                  value={newUserForm.ds_role}
                  onChange={(val: string) => setNewUserForm({ ...newUserForm, ds_role: val })}
                />
              </div>
              <div className="modal-buttons" style={{marginTop: '1.5rem'}}>
                <button className="btn-confirm" onClick={handleCreateUser} disabled={isCreatingUser}>
                  {isCreatingUser ? <><div className="spinner"></div> CRIANDO...</> : 'CRIAR USUÁRIO'}
                </button>
                <button className="btn-cancel" onClick={() => { setIsNewUserModalOpen(false); setNewUserForm({ nm_profile: '', email: '', password: '', ds_role: 'USER' }); }}>CANCELAR</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        onClose={() => { setIsConfirmModalOpen(false); setUserToDelete(null); }}
        onConfirm={handleDeleteUser}
        title="Excluir Usuário"
        message="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita e removerá todos os dados vinculados."
        confirmText="SIM, EXCLUIR"
        cancelText="CANCELAR"
      />

      <ConfirmModal 
        isOpen={isBookingConfirmOpen}
        onClose={() => { setIsBookingConfirmOpen(false); setBookingToDelete(null); }}
        onConfirm={handleConfirmDeleteBooking}
        title="Excluir Reserva"
        message="Tem certeza que deseja cancelar este agendamento? Esta ação removerá permanentemente a reserva da sala."
        confirmText="SIM, CANCELAR"
        cancelText="MANTER RESERVA"
      />
      </div>
      <footer className="institutional-footer">
        <div className="footer-orange-bar"></div>
        <div className="footer-content">
          <div className="footer-logo-group">
            <span className="footer-label">Idealização:</span>
            <div className="logo-bora-footer">Bora<span>BRASIL</span></div>
          </div>
          <div className="footer-logo-group">
            <span className="footer-label">Realização:</span>
            <div className="logo-ad-footer">ad<span>latinoamericana</span></div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Dashboard;
