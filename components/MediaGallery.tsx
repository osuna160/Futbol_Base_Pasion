import React, { useState, useRef, useEffect } from 'react';
import type { MediaItem } from '../types';
import { TrashIcon, ArrowUpTrayIcon, LinkIcon } from './icons';
import { addMedia, getMedia, deleteMedia } from './db';

interface MediaGalleryProps {
    mediaItems: MediaItem[];
    onMediaItemsChange: (items: MediaItem[]) => void;
    onBack: () => void;
}

const getYoutubeEmbedUrl = (url: string) => {
    let videoId = '';
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeRegex);
    if (match) {
        videoId = match[1];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};


const MediaGallery: React.FC<MediaGalleryProps> = ({ mediaItems, onMediaItemsChange, onBack }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showYoutubeModal, setShowYoutubeModal] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [youtubeName, setYoutubeName] = useState('');
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [mediaSources, setMediaSources] = useState<Record<string, string>>({});

    useEffect(() => {
        const loadSources = async () => {
            const sources: Record<string, string> = {};
            for (const item of mediaItems) {
                if (item.storage === 'indexeddb') {
                    const blob = await getMedia(item.id);
                    if (blob) {
                        sources[item.id] = URL.createObjectURL(blob);
                    }
                } else {
                    sources[item.id] = item.dataUrl;
                }
            }
            setMediaSources(sources);
        };
        loadSources();

        return () => {
            Object.values(mediaSources).forEach(url => {
                // Fix: Add type guard to ensure url is a string before calling startsWith.
                if(typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mediaItems]);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        const newMediaItems: MediaItem[] = [];
        for (const file of files) {
            // Fix: Add instanceof check to safely handle file objects.
            if (file instanceof File) {
                const id = `${Date.now()}-${file.name}`;
                await addMedia(id, file);
                newMediaItems.push({
                    id,
                    type: file.type,
                    name: file.name,
                    storage: 'indexeddb',
                    dataUrl: '' // Placeholder
                });
            }
        }
        
        onMediaItemsChange([...mediaItems, ...newMediaItems]);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDelete = (id: string) => {
        setItemToDelete(id);
    };

    const confirmDelete = async () => {
        if(itemToDelete) {
            const item = mediaItems.find(i => i.id === itemToDelete);
            if (item && item.storage === 'indexeddb') {
                await deleteMedia(itemToDelete);
            }
            onMediaItemsChange(mediaItems.filter(item => item.id !== itemToDelete));
            setItemToDelete(null);
        }
    };
    
    const handleAddYoutube = () => {
        const embedUrl = getYoutubeEmbedUrl(youtubeUrl);
        if (embedUrl) {
            const newItem: MediaItem = {
                id: `${Date.now()}-youtube`,
                type: 'video/youtube',
                dataUrl: embedUrl,
                name: youtubeName || 'Vídeo de YouTube'
            };
            onMediaItemsChange([...mediaItems, newItem]);
            setShowYoutubeModal(false);
            setYoutubeUrl('');
            setYoutubeName('');
        } else {
            alert('URL de YouTube no válida.');
        }
    };
    
    const sortedMedia = [...mediaItems].sort((a,b) => parseInt(b.id.split('-')[0]) - parseInt(a.id.split('-')[0]));

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg max-w-6xl mx-auto animate-fade-in">
             <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400">Galería Multimedia</h2>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm inline-flex items-center gap-2">
                        <ArrowUpTrayIcon /> Subir Archivos
                    </button>
                    <button onClick={() => setShowYoutubeModal(true)} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm inline-flex items-center gap-2">
                        <LinkIcon /> Añadir Vídeo de YouTube
                    </button>
                    <button onClick={onBack} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                        &larr; Volver al Inicio
                    </button>
                </div>
            </div>

            <input
                type="file"
                multiple
                accept="image/*,video/*"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
            />
            
            {sortedMedia.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {sortedMedia.map(item => (
                        <div key={item.id} className="media-thumbnail group">
                            {item.type.startsWith('image/') && mediaSources[item.id] && <img src={mediaSources[item.id]} alt={item.name} />}
                            {item.type.startsWith('video/') && item.type !== 'video/youtube' && mediaSources[item.id] && <video src={mediaSources[item.id]} controls />}
                            {item.type === 'video/youtube' && (
                                <iframe
                                    src={item.dataUrl}
                                    title={item.name}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                ></iframe>
                            )}
                            <div className="overlay truncate">{item.name}</div>
                            <button onClick={() => handleDelete(item.id)} className="delete-btn" title="Eliminar">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-20 bg-gray-900/50 rounded-lg">
                    <h3 className="text-2xl font-semibold">Galería Vacía</h3>
                    <p className="text-gray-400 mt-2">Sube tus fotos, vídeos o añade enlaces de YouTube para empezar.</p>
                </div>
            )}
            
            {showYoutubeModal && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
                      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl text-white">
                         <h2 className="text-xl font-bold mb-4">Añadir Vídeo de YouTube</h2>
                         <div className="space-y-4">
                            <input type="text" placeholder="Nombre del vídeo (ej: Partido vs Rival)" value={youtubeName} onChange={e => setYoutubeName(e.target.value)} className="bg-gray-700 p-2 rounded w-full" />
                            <input type="url" placeholder="Pega la URL del vídeo de YouTube aquí" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} className="bg-gray-700 p-2 rounded w-full" />
                         </div>
                         <div className="flex justify-end gap-4 mt-6">
                            <button onClick={() => setShowYoutubeModal(false)} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded">Cancelar</button>
                            <button onClick={handleAddYoutube} className="bg-red-600 hover:bg-red-700 font-bold py-2 px-4 rounded">Añadir Vídeo</button>
                         </div>
                      </div>
                 </div>
            )}

            {itemToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
                      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-xl text-white">
                         <h2 className="text-xl font-bold mb-4">Confirmar Eliminación</h2>
                         <p className="text-gray-300 mb-6">¿Seguro que quieres eliminar este elemento? Esta acción no se puede deshacer.</p>
                         <div className="flex justify-end gap-4">
                            <button onClick={() => setItemToDelete(null)} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded">Cancelar</button>
                            <button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 font-bold py-2 px-4 rounded">Confirmar</button>
                         </div>
                      </div>
                 </div>
            )}
        </div>
    );
};

export default MediaGallery;