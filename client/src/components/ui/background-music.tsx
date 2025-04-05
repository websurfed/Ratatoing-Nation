import { useEffect, useState } from 'react';

const BackgroundMusic = ({ volume = 100 }) => {
  const [audio] = useState(new Audio('/src/assets/music/SynthesisOfCheeze1.MP3'));

  useEffect(() => {
    audio.loop = true;
    audio.volume = volume / 100;

    const playMusic = () => {
      audio.play().catch((error) => {
        console.error('Error attempting to play music:', error);
      });
    };

    // Add an event listener to the document to start the music on click
    document.addEventListener('click', playMusic, { once: true });

    return () => {
      audio.pause();
      audio.currentTime = 0;
      document.removeEventListener('click', playMusic);
    };
  }, [audio, volume]);

  return null; // The component doesn’t render anything
};

export default BackgroundMusic;