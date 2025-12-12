import React from 'react';
import { NavLink, Link } from 'react-router-dom';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { to: '/admin/tools', label: 'Tools', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { to: '/admin/workflows', label: 'Workflows', icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' },
  { to: '/admin/forum', label: 'Forum', icon: 'M3 5a3 3 0 013-3h12a3 3 0 013 3v6a3 3 0 01-3 3h-4.586L12 17.414 9.586 14H6a3 3 0 01-3-3V5z' },
  { to: '/admin/news', label: 'News', icon: 'M4 4h12l4 4v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm12 0v4h4M6 8h8M6 12h8M6 16h5' },
  { to: '/admin/analytics', label: 'Internal Analytics', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0 1 9.75 19.875V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z' },
  { to: '/admin/google-analytics', label: 'Google Analytics', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
  { to: '/admin/users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197' },
];

const NavIcon: React.FC<{ path: string }> = ({ path }) => (
    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
);

const AdminSidebar: React.FC = () => {
    
    const linkClass = "flex items-center px-4 py-2 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white";
    const activeLinkClass = "flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg";
    
    return (
        <aside className="hidden md:flex flex-col w-64 bg-gray-800 text-gray-300">
            <div className="flex items-center justify-center h-16 bg-gray-900">
                <Link to="/" className="text-white font-bold text-lg">Mike's AI Forge</Link>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-2">
                {(import.meta.env.VITE_ENABLE_ADMIN_ANALYTICS === 'true' ? navItems : navItems.filter(i => i.to !== '/admin/analytics' && i.to !== '/admin/google-analytics')).map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => (isActive ? activeLinkClass : linkClass)}
                    >
                        <NavIcon path={item.icon} />
                        <span className="ml-3">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="px-2 py-4">
                 <Link to="/" className={`${linkClass} text-sm`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    <span className="ml-3">Back to Main Site</span>
                </Link>
            </div>
        </aside>
    );
};

export default AdminSidebar;
