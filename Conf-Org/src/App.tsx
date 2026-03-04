import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CoreValues from './components/CoreValues';
import Features from './components/Features';
import Partners from './components/Partners';
import CallToAction from './components/CallToAction';
import Footer from './components/Footer';
import Register from './pages/Register';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Conferences from './pages/Conferences';
import ConferenceDetail from './pages/ConferenceDetail';
import CreateConference from './pages/CreateConference';
import Papers from './pages/Papers';
import PaperDetail from './pages/PaperDetail';
import SubmitPaper from './pages/SubmitPaper';
import AssignSessions from './pages/AssignSessions';
import MyPapers from './pages/MyPapers';
import MyPaperDetail from './pages/MyPaperDetail';
import AiAssistant from './pages/AiAssistant'; // IMPORT NEW PAGE
import AttendancesManagement from './pages/AttendencesManagement';
import { supabase } from './lib/supabase';

// Simple Route State management to avoid adding react-router-dom dependency
type Page = 'home' | 'register' | 'login' | 'profile' | 'conferences' | 'conference-detail' | 'create-conference' | 'papers' | 'paper-detail' | 'submit-paper' | 'assign-sessions' | 'my-papers' | 'my-paper-detail' | 'ai-assistant' | 'attendences-management';

interface UserSession {
  name: string;
  email: string;
  role: string;
  roleId: number;
  avatar?: string;
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userRoleId, setUserRoleId] = useState<number>(0);
  const [userAvatar, setUserAvatar] = useState('');
  
  // New State for Detail Page
  const [selectedConferenceId, setSelectedConferenceId] = useState<number>(0);
  // New State for Paper Detail Page
  const [selectedPaperId, setSelectedPaperId] = useState<number>(0);

  // Persist Login State
  useEffect(() => {
    const storedUser = localStorage.getItem('conf_user');
    if (storedUser) {
      try {
        const session: UserSession = JSON.parse(storedUser);
        if (session.name) {
          setIsLoggedIn(true);
          setUserName(session.name);
          setUserEmail(session.email || '');
          setUserRole(session.role || '');
          setUserRoleId(session.roleId || 0);
          setUserAvatar(session.avatar || '');
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('conf_user');
      }
    }
  }, []);

  const refreshUserSession = async () => {
    if (!userEmail) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          full_name,
          email,
          avatar_url,
          user_roles (
            role_id,
            roles (
              role_name
            )
          )
        `)
        .eq('email', userEmail)
        .single();

      if (error) {
        console.error('Error refreshing session:', error);
        return;
      }

      if (data) {
         let roleName = 'User';
         let rId = 0;
         // @ts-ignore
         if (data.user_roles && data.user_roles.length > 0) {
             // @ts-ignore
             if (data.user_roles[0].roles) {
                 // @ts-ignore
                 roleName = data.user_roles[0].roles.role_name;
             }
             // @ts-ignore
             rId = data.user_roles[0].role_id;
         }
         
         setUserName(data.full_name);
         setUserRole(roleName);
         setUserRoleId(rId);
         setUserAvatar(data.avatar_url || '');
         
         const session: UserSession = { 
            name: data.full_name, 
            email: data.email, 
            role: roleName,
            roleId: rId,
            avatar: data.avatar_url || ''
         };
         localStorage.setItem('conf_user', JSON.stringify(session));
      }
    } catch (err) {
      console.error('Error refreshing session:', err);
    }
  };

  const navigateToRegister = () => {
    window.scrollTo(0, 0);
    setCurrentPage('register');
  };

  const navigateToLogin = () => {
    window.scrollTo(0, 0);
    setCurrentPage('login');
  };

  const navigateToHome = () => {
    window.scrollTo(0, 0);
    setCurrentPage('home');
    if (isLoggedIn) {
      refreshUserSession();
    }
  };

  const navigateToProfile = () => {
    window.scrollTo(0, 0);
    setCurrentPage('profile');
  };

  const navigateToConferences = () => {
    window.scrollTo(0, 0);
    setCurrentPage('conferences');
  }

  const navigateToConferenceDetail = (confId: number) => {
    setSelectedConferenceId(confId);
    window.scrollTo(0, 0);
    setCurrentPage('conference-detail');
  };

  const navigateToCreateConference = () => {
    window.scrollTo(0, 0);
    setCurrentPage('create-conference');
  };

  const navigateToPapers = () => {
    window.scrollTo(0, 0);
    setCurrentPage('papers');
  };

  const navigateToPaperDetail = (paperId: number) => {
    setSelectedPaperId(paperId);
    window.scrollTo(0, 0);
    setCurrentPage('paper-detail');
  };

  const navigateToSubmitPaper = () => {
    window.scrollTo(0, 0);
    setCurrentPage('submit-paper');
  };

  const navigateToAssignSessions = () => {
    window.scrollTo(0, 0);
    setCurrentPage('assign-sessions');
  };

  const navigateToMyPapers = () => {
    window.scrollTo(0, 0);
    setCurrentPage('my-papers');
  };

  const navigateToMyPaperDetail = (paperId: number) => {
    setSelectedPaperId(paperId);
    window.scrollTo(0, 0);
    setCurrentPage('my-paper-detail');
  };

  const navigateToAiAssistant = () => {
    window.scrollTo(0, 0);
    setCurrentPage('ai-assistant');
  };

  const navigateToAttendences = () => {
  window.scrollTo(0, 0);
  setCurrentPage('attendences-management'); 
};

  const handleAuthSuccess = (data: { name: string; email: string; role: string; roleId: number; avatar: string }) => {
    setIsLoggedIn(true);
    setUserName(data.name);
    setUserEmail(data.email);
    setUserRole(data.role);
    setUserRoleId(data.roleId);
    setUserAvatar(data.avatar);
    
    const session: UserSession = { 
      name: data.name, 
      email: data.email, 
      role: data.role,
      roleId: data.roleId,
      avatar: data.avatar
    };
    localStorage.setItem('conf_user', JSON.stringify(session));
    navigateToHome();
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName('');
    setUserEmail('');
    setUserRole('');
    setUserRoleId(0);
    setUserAvatar('');
    localStorage.removeItem('conf_user');
    navigateToHome();
  };

  // Render Register Page
  if (currentPage === 'register') {
    return (
      <Register 
        onNavigateHome={navigateToHome} 
        onNavigateLogin={navigateToLogin}
        onRegisterSuccess={handleAuthSuccess}
      />
    );
  }

  // Render Login Page
  if (currentPage === 'login') {
    return (
      <Login 
        onNavigateHome={navigateToHome}
        onNavigateRegister={navigateToRegister}
        onLoginSuccess={handleAuthSuccess}
      />
    );
  }

  // Render Profile Page
  if (currentPage === 'profile') {
    return (
      <Profile 
        userEmail={userEmail}
        onNavigateHome={navigateToHome}
        onNavigateMyPapers={navigateToMyPapers} // Pass navigator
      />
    );
  }

  // Render Create Conference Page
  if (currentPage === 'create-conference') {
    return (
      <>
        <Navbar 
          onNavigateRegister={navigateToRegister} 
          onNavigateLogin={navigateToLogin}
          onNavigateProfile={navigateToProfile}
          onNavigateConferences={navigateToConferences}
          onNavigateHome={navigateToHome}
          onNavigatePapers={navigateToPapers}
          onNavigateAiAssistant={navigateToAiAssistant}
          onNavigateAttendences={navigateToAttendences}
          onLogout={handleLogout}
          isLoggedIn={isLoggedIn}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userRoleId={userRoleId}
          userAvatar={userAvatar}
        />
        <CreateConference 
          onNavigateBack={navigateToConferences}
          userRoleId={userRoleId}
        />
        <Footer />
      </>
    );
  }

  // Render Conference List Page
  if (currentPage === 'conferences') {
    return (
      <>
        <Navbar 
          onNavigateRegister={navigateToRegister} 
          onNavigateLogin={navigateToLogin}
          onNavigateProfile={navigateToProfile}
          onNavigateConferences={navigateToConferences}
          onNavigateHome={navigateToHome}
          onNavigatePapers={navigateToPapers}
          onNavigateAiAssistant={navigateToAiAssistant}
          onNavigateAttendences={navigateToAttendences}
          onLogout={handleLogout}
          isLoggedIn={isLoggedIn}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userRoleId={userRoleId}
          userAvatar={userAvatar}
        />
        <Conferences 
          onNavigateHome={navigateToHome} 
          onNavigateDetail={navigateToConferenceDetail}
          onNavigateCreate={navigateToCreateConference}
          userRoleId={userRoleId}
        />
        <Footer />
      </>
    );
  }

  // Render Conference Detail Page
  if (currentPage === 'conference-detail') {
    return (
      <>
        <Navbar 
          onNavigateRegister={navigateToRegister} 
          onNavigateLogin={navigateToLogin}
          onNavigateProfile={navigateToProfile}
          onNavigateConferences={navigateToConferences}
          onNavigateHome={navigateToHome}
          onNavigatePapers={navigateToPapers}
          onNavigateAiAssistant={navigateToAiAssistant}
          onNavigateAttendences={navigateToAttendences}
          onLogout={handleLogout}
          isLoggedIn={isLoggedIn}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userRoleId={userRoleId}
          userAvatar={userAvatar}
        />
        <ConferenceDetail 
          conferenceId={selectedConferenceId}
          onNavigateBack={navigateToConferences}
          // Pass navigation prop for Assign Sessions
          onNavigateAssignSessions={navigateToAssignSessions}
          userRoleId={userRoleId} // Pass role to check permissions
        />
        <Footer />
      </>
    );
  }

  // Render Papers List Page
  if (currentPage === 'papers') {
    return (
      <>
        <Navbar 
          onNavigateRegister={navigateToRegister} 
          onNavigateLogin={navigateToLogin}
          onNavigateProfile={navigateToProfile}
          onNavigateConferences={navigateToConferences}
          onNavigateHome={navigateToHome}
          onNavigatePapers={navigateToPapers}
          onNavigateAiAssistant={navigateToAiAssistant}
          onNavigateAttendences={navigateToAttendences}
          onLogout={handleLogout}
          isLoggedIn={isLoggedIn}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userRoleId={userRoleId}
          userAvatar={userAvatar}
        />
        <Papers 
          onNavigateHome={navigateToHome} 
          onNavigateDetail={navigateToPaperDetail}
          onNavigateSubmit={navigateToSubmitPaper}
          userRoleId={userRoleId}
        />
        <Footer />
      </>
    );
  }

  // Render Paper Detail Page
  if (currentPage === 'paper-detail') {
    return (
      <>
        <Navbar 
          onNavigateRegister={navigateToRegister} 
          onNavigateLogin={navigateToLogin}
          onNavigateProfile={navigateToProfile}
          onNavigateConferences={navigateToConferences}
          onNavigateHome={navigateToHome}
          onNavigatePapers={navigateToPapers}
          onNavigateAiAssistant={navigateToAiAssistant}
          onNavigateAttendences={navigateToAttendences}
          onLogout={handleLogout}
          isLoggedIn={isLoggedIn}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userRoleId={userRoleId}
          userAvatar={userAvatar}
        />
        <PaperDetail 
          paperId={selectedPaperId}
          onNavigateBack={navigateToPapers} 
        />
        <Footer />
      </>
    );
  }

  // Render Submit Paper Page
  if (currentPage === 'submit-paper') {
    return (
      <>
        <Navbar 
          onNavigateRegister={navigateToRegister} 
          onNavigateLogin={navigateToLogin}
          onNavigateProfile={navigateToProfile}
          onNavigateConferences={navigateToConferences}
          onNavigateHome={navigateToHome}
          onNavigatePapers={navigateToPapers}
          onNavigateAiAssistant={navigateToAiAssistant}
          onNavigateAttendences={navigateToAttendences}
          onLogout={handleLogout}
          isLoggedIn={isLoggedIn}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userRoleId={userRoleId}
          userAvatar={userAvatar}
        />
        <SubmitPaper 
          userEmail={userEmail}
          userRoleId={userRoleId}
          onNavigateBack={navigateToPapers}
        />
        <Footer />
      </>
    );
  }

  // Render Assign Sessions Page
  if (currentPage === 'assign-sessions') {
    return (
      <>
        <Navbar 
          onNavigateRegister={navigateToRegister} 
          onNavigateLogin={navigateToLogin}
          onNavigateProfile={navigateToProfile}
          onNavigateConferences={navigateToConferences}
          onNavigateHome={navigateToHome}
          onNavigatePapers={navigateToPapers}
          onNavigateAiAssistant={navigateToAiAssistant}
          onNavigateAttendences={navigateToAttendences}
          onLogout={handleLogout}
          isLoggedIn={isLoggedIn}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userRoleId={userRoleId}
          userAvatar={userAvatar}
        />
        <AssignSessions
          conferenceId={selectedConferenceId}
          userRoleId={userRoleId}
          onNavigateBack={() => navigateToConferenceDetail(selectedConferenceId)}
        />
        <Footer />
      </>
    );
  }

  // Render My Papers Page (NEW)
  if (currentPage === 'my-papers') {
    return (
      <>
        <Navbar 
          onNavigateRegister={navigateToRegister} 
          onNavigateLogin={navigateToLogin}
          onNavigateProfile={navigateToProfile}
          onNavigateConferences={navigateToConferences}
          onNavigateHome={navigateToHome}
          onNavigatePapers={navigateToPapers}
          onNavigateAiAssistant={navigateToAiAssistant}
          onNavigateAttendences={navigateToAttendences}
          onLogout={handleLogout}
          isLoggedIn={isLoggedIn}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userRoleId={userRoleId}
          userAvatar={userAvatar}
        />
        <MyPapers 
          userEmail={userEmail}
          onNavigateDetail={navigateToMyPaperDetail}
          onNavigateHome={navigateToHome}
        />
        <Footer />
      </>
    );
  }

  // Render My Paper Detail Page (NEW)
  if (currentPage === 'my-paper-detail') {
    return (
      <>
        <Navbar 
          onNavigateRegister={navigateToRegister} 
          onNavigateLogin={navigateToLogin}
          onNavigateProfile={navigateToProfile}
          onNavigateConferences={navigateToConferences}
          onNavigateHome={navigateToHome}
          onNavigatePapers={navigateToPapers}
          onNavigateAiAssistant={navigateToAiAssistant}
          onNavigateAttendences={navigateToAttendences}
          onLogout={handleLogout}
          isLoggedIn={isLoggedIn}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userRoleId={userRoleId}
          userAvatar={userAvatar}
        />
        <MyPaperDetail 
          paperId={selectedPaperId}
          onNavigateBack={navigateToMyPapers}
        />
        <Footer />
      </>
    );
  }

  // Render AI Assistant Page (NEW)
  if (currentPage === 'ai-assistant') {
    return (
      <>
        <Navbar 
          onNavigateRegister={navigateToRegister} 
          onNavigateLogin={navigateToLogin}
          onNavigateProfile={navigateToProfile}
          onNavigateConferences={navigateToConferences}
          onNavigateHome={navigateToHome}
          onNavigatePapers={navigateToPapers}
          onNavigateAiAssistant={navigateToAiAssistant}
          onNavigateAttendences={navigateToAttendences}
          onLogout={handleLogout}
          isLoggedIn={isLoggedIn}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userRoleId={userRoleId}
          userAvatar={userAvatar}
        />
        <AiAssistant />
        {/* No Footer on Chat Page for full-height experience */}
      </>
    );
  }

  // Render Attendances Management Page
    if (currentPage === 'attendences-management') {
      return (
        <>
          <Navbar 
            onNavigateRegister={navigateToRegister} 
            onNavigateLogin={navigateToLogin}
            onNavigateProfile={navigateToProfile}
            onNavigateConferences={navigateToConferences}
            onNavigateHome={navigateToHome}
            onNavigatePapers={navigateToPapers}
            onNavigateAiAssistant={navigateToAiAssistant}
            onNavigateAttendences={navigateToAttendences} 
            onLogout={handleLogout}
            isLoggedIn={isLoggedIn}
            userName={userName}
            userEmail={userEmail}
            userRole={userRole}
            userRoleId={userRoleId}
            userAvatar={userAvatar}
          />
          <AttendancesManagement 
            userRoleId={userRoleId} // Truyền quyền để kiểm tra Admin/Secretary [cite: 262, 588]
            onNavigateBack={navigateToHome}
          />
          <Footer />
        </>
      );
    }
  

  // Render Landing Page
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 animate-in fade-in duration-300">
      <Navbar 
        onNavigateRegister={navigateToRegister} 
        onNavigateLogin={navigateToLogin}
        onNavigateProfile={navigateToProfile}
        onNavigateConferences={navigateToConferences}
        onNavigateHome={navigateToHome}
        onNavigatePapers={navigateToPapers}
        onNavigateAiAssistant={navigateToAiAssistant}
        onNavigateAttendences={navigateToAttendences}
        onLogout={handleLogout}
        isLoggedIn={isLoggedIn}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        userRoleId={userRoleId}
        userAvatar={userAvatar}
      />
      <main className="flex-grow">
        <Hero onNavigateRegister={navigateToRegister} />
        <CoreValues />
        <Features />
        <Partners />
        <CallToAction onNavigateRegister={navigateToRegister} />
      </main>
      <Footer />
    </div>
  );
};

export default App;