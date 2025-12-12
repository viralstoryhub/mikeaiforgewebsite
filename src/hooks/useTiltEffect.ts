
import { useEffect, useRef } from 'react';

export const useTiltEffect = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.style.setProperty('--mouse-x', '50%');
    element.style.setProperty('--mouse-y', '50%');

    const handleMouseMove = (e: MouseEvent) => {
      const { left, top, width, height } = element.getBoundingClientRect();
      const mouseX = e.clientX - left;
      const mouseY = e.clientY - top;
      
      const x = mouseX / width - 0.5;
      const y = mouseY / height - 0.5;

      const rotateY = x * 15; // Max rotation
      const rotateX = -y * 15; // Max rotation

      element.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
      element.style.setProperty('--mouse-x', `${(mouseX / width) * 100}%`);
      element.style.setProperty('--mouse-y', `${(mouseY / height) * 100}%`);
    };

    const handleMouseLeave = () => {
      element.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      element.style.setProperty('--mouse-x', `50%`);
      element.style.setProperty('--mouse-y', `50%`);
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (element) {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return ref;
};
