import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Send, Bot, User, Loader2, Image as ImageIcon, X, Paperclip, FileText, Upload, Menu, StopCircle, Download, Maximize2, Trash2, Sparkles, MessageCircle, Zap, Camera, Cpu, RefreshCw, Bitcoin, Coins } from 'lucide-react';
import { useAuth, handleFirestoreError, OperationType } from '../context/AuthContext';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, limit, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import ConfirmModal from './ConfirmModal';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  imageUrl?: string;
  createdAt?: any;
}

interface ChatProps {
  sessionId?: string;
  onBack?: () => void;
  onToggleSidebar?: () => void;
}

export default function Chat({ sessionId, onBack, onToggleSidebar }: ChatProps) {
  const { user, theme, language } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string | null; type: string } | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId);
  const [showClearModal, setShowClearModal] = useState(false);
  const [selectedImageForModal, setSelectedImageForModal] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setSelectedImage(dataUrl);
        // Create a dummy file object for consistency
        const blob = dataURLtoBlob(dataUrl);
        setImageFile(new File([blob], "camera_capture.jpg", { type: "image/jpeg" }));
        stopCamera();
      }
    }
  };

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return new Blob();
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  useEffect(() => {
    setCurrentSessionId(sessionId);
  }, [sessionId]);

  const scrollToBottom = (instant = false) => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: instant ? 'auto' : 'smooth'
      });
    }
  };

  useEffect(() => {
    if (!user || !currentSessionId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', user.uid, 'sessions', currentSessionId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${user.uid}/sessions/${currentSessionId}/messages`);
    });

    return () => unsubscribe();
  }, [user, currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial scroll to bottom when session changes
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [currentSessionId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setSelectedFile({
          name: file.name,
          content: file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') ? content : null,
          type: file.type
        });
      };
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage && !selectedFile) || isLoading || !user) return;

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'undefined') {
      console.error('GEMINI_API_KEY is missing or undefined');
      const errorMsg = {
        id: Date.now().toString(),
        role: 'model' as const,
        content: 'Lỗi: Chưa cấu hình API Key cho AI. Vui lòng kiểm tra tệp .env hoặc cài đặt môi trường.',
        createdAt: serverTimestamp()
      };
      setMessages(prev => [...prev, errorMsg]);
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);

    const userMsg = input.trim();
    const currentImage = selectedImage;
    const currentFile = selectedFile;
    
    setInput('');
    removeImage();
    removeFile();
    setIsLoading(true);

    try {
      let activeSessionId = currentSessionId;

      if (!activeSessionId) {
        const sessionRef = await addDoc(collection(db, 'chats', user.uid, 'sessions'), {
          title: userMsg.substring(0, 50) || (currentImage ? 'Hình ảnh mới' : currentFile ? `Tệp: ${currentFile.name}` : 'Cuộc trò chuyện mới'),
          lastMessage: userMsg || (currentImage ? 'Hình ảnh' : 'Tệp đính kèm'),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        activeSessionId = sessionRef.id;
        setCurrentSessionId(activeSessionId);
      }

      const userMessageData = {
        role: 'user',
        content: userMsg || (currentImage ? "Phân tích hình ảnh này" : currentFile ? `Phân tích tệp: ${currentFile.name}` : ""),
        imageUrl: currentImage || null,
        fileName: currentFile?.name || null,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'chats', user.uid, 'sessions', activeSessionId, 'messages'), userMessageData);

      const parts: any[] = [];
      if (userMsg) parts.push({ text: userMsg });
      
      if (currentImage) {
        // Ensure we have a valid base64 string
        const base64Data = currentImage.includes(',') ? currentImage.split(',')[1] : currentImage;
        const mimeType = currentImage.match(/:(.*?);/)?.[1] || 'image/jpeg';
        
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      if (currentFile) {
        if (currentFile.content) {
          parts.push({ text: `Nội dung tệp ${currentFile.name}:\n\n${currentFile.content}` });
        } else {
          parts.push({ text: `Người dùng đã gửi tệp: ${currentFile.name} (Loại: ${currentFile.type}). Hãy hỗ trợ người dùng dựa trên thông tin này.` });
        }
      }

      let modelName = 'gemini-3-flash-preview';
      let temperature = 0.7;
      let thinkingConfig = undefined;

      const systemInstruction = `
        Bạn là AI CRYPTO - một trợ lý AI đa năng, thông minh và là chuyên gia trong lĩnh vực tiền điện tử (Cryptocurrency).
        NGÔN NGỮ PHẢN HỒI: ${language === 'vi' ? 'Tiếng Việt' : 'English'}
        
        NHIỆM VỤ CHÍNH:
        1. TRẢ LỜI TRỰC TIẾP: Hãy trả lời thẳng vào vấn đề mà người dùng hỏi. TUYỆT ĐỐI KHÔNG hỏi lại những câu như "Bạn cần giải gì?" hay "Tôi có thể giúp gì?". Hãy bắt đầu trả lời ngay lập tức dựa trên thông tin nhận được.
        2. MỞ RỘNG CÂU TRẢ LỜI: Hãy cung cấp thông tin chi tiết, giải thích cặn kẽ và mở rộng thêm các kiến thức liên quan để người dùng hiểu sâu hơn về vấn đề. Đặc biệt là các kiến thức về Blockchain, Crypto, DeFi, NFT nếu người dùng quan tâm.
        3. GIẢI QUYẾT VẤN ĐỀ: Xử lý các vấn đề phức tạp (toán học, lập trình, phân tích dữ liệu) một cách chính xác và tối ưu.
        4. NHẬN DIỆN HÌNH ẢNH: Khi người dùng gửi ảnh, bạn phải phân tích cực kỳ chi tiết. Nếu ảnh hơi mờ, hãy sử dụng khả năng suy luận để đoán các ký tự hoặc nội dung dựa trên ngữ cảnh. TUYỆT ĐỐI KHÔNG ĐƯỢC TRẢ LỜI SAI các câu hỏi có trong ảnh.
        5. PHÂN TÍCH TỆP: Khi người dùng gửi tệp (PDF, tài liệu, mã nguồn), hãy đọc kỹ toàn bộ nội dung được cung cấp và hỗ trợ theo yêu cầu cụ thể.
        6. PHONG CÁCH TRẢ LỜI: Chuyên nghiệp, thân thiện, sử dụng Markdown để định dạng câu trả lời (bảng, danh sách, mã nguồn).
        
        QUY TẮC AN TOÀN: Tuyệt đối không hỗ trợ các yêu cầu vi phạm pháp luật, bạo lực hoặc gây hại.
        
        MÀU SẮC CHỦ ĐẠO CỦA APP: Vàng và Cam (Gold & Orange) - phong cách Crypto. Hãy thể hiện sự chuyên nghiệp và hiện đại.
      `;

      const aiMsgRef = await addDoc(collection(db, 'chats', user.uid, 'sessions', activeSessionId, 'messages'), {
        role: 'model',
        content: '',
        createdAt: serverTimestamp()
      });

      const result = await ai.models.generateContentStream({
        model: modelName,
        contents: { parts },
        config: {
          systemInstruction,
          temperature,
          topP: 0.9,
          topK: 40,
          thinkingConfig,
        }
      });

      let fullResponse = '';
      for await (const chunk of result) {
        if (controller.signal.aborted) break;
        const text = chunk.text;
        fullResponse += text;
        await updateDoc(aiMsgRef, { content: fullResponse });
      }

      await updateDoc(doc(db, 'chats', user.uid, 'sessions', activeSessionId), {
        lastMessage: fullResponse.substring(0, 100),
        updatedAt: serverTimestamp()
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation aborted');
      } else {
        console.error('AI Error:', error);
        
        let errorMessage = error.message || 'Đã có lỗi xảy ra khi kết nối với máy chủ AI. Vui lòng kiểm tra API Key.';
        
        // Handle Quota Exceeded error (429)
        if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
          errorMessage = 'Hệ thống AI đang quá tải hoặc hết hạn mức (Quota 429). Vui lòng đợi 1-5 phút hoặc thử lại sau.';
        }

        // Thêm tin nhắn lỗi vào chat để người dùng biết
        const errorMsg = {
          id: Date.now().toString(),
          role: 'model' as const,
          content: `Lỗi AI: ${errorMessage}`,
          createdAt: serverTimestamp()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const clearHistory = async () => {
    if (!user || !currentSessionId) return;
    try {
      const messagesRef = collection(db, 'chats', user.uid, 'sessions', currentSessionId, 'messages');
      const snapshot = await getDocs(messagesRef);
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      setShowClearModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chats/${user.uid}/sessions/${currentSessionId}/messages`);
    }
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-crypto-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] w-full max-w-screen-2xl mx-auto relative">
      <ConfirmModal 
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={clearHistory}
        title="Xóa lịch sử"
        message="Bạn có chắc chắn muốn xóa tất cả tin nhắn trong phiên này? Hành động này không thể hoàn tác."
        confirmText="Xóa hết"
        cancelText="Hủy"
      />

      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex flex-col justify-between p-6">
                <div className="flex justify-end">
                  <button 
                    onClick={stopCamera}
                    className="p-3 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex justify-center pb-4">
                  <button 
                    onClick={capturePhoto}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all border-4 border-white/20"
                  >
                    <div className="w-16 h-16 border-2 border-slate-900 rounded-full" />
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-6 text-white/60 text-sm font-medium uppercase tracking-widest">Chụp ảnh để gửi cho AI</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImageForModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImageForModal(null)}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 md:p-10 cursor-zoom-out"
          >
            <div className="absolute top-6 right-6 flex gap-4" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => downloadImage(selectedImageForModal)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                title="Tải về"
              >
                <Download className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setSelectedImageForModal(null)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                title="Đóng"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImageForModal} 
              alt="Full view" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <header className="mb-6 shrink-0 flex items-center justify-between gap-4 px-4 md:px-0">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button 
              onClick={onToggleSidebar} 
              className={`p-2 rounded-xl transition-colors md:hidden ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
          {onBack && (
            <button onClick={onBack} className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <X className="w-6 h-6" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className={`text-xl md:text-2xl font-black flex items-center gap-2 truncate ${theme === 'dark' ? 'text-slate-100' : 'text-blue-900'}`}>
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Bitcoin className="w-5 h-5 text-white" />
              </div>
              AI CRYPTO
            </h1>
            <p className={`text-xs md:text-sm truncate flex items-center gap-1 ${theme === 'dark' ? 'text-slate-400' : 'text-blue-500'}`}>
              <Zap className="w-3 h-3 text-amber-500" />
              Chuyên gia phân tích tiền điện tử và hỗ trợ đa năng
            </p>
          </div>
        </div>
          <button
            onClick={() => setShowClearModal(true)}
            className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            title="Xóa lịch sử"
          >
            <Trash2 className="w-6 h-6" />
          </button>
      </header>

      <div className={`flex-1 rounded-2xl shadow-sm border flex flex-col overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-blue-100'}`}>
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-6 space-y-4"
        >
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
              <motion.div 
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="w-24 h-24 bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 rounded-[2.5rem] flex items-center justify-center relative shadow-2xl shadow-orange-500/30"
              >
                <Bitcoin className="w-12 h-12 text-white" />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </motion.div>
              <div className="space-y-2">
                <h2 className={`text-3xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Chào mừng bạn!</h2>
                <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Tôi là AI CRYPTO, trợ lý thông minh của bạn. Hãy bắt đầu cuộc trò chuyện bằng cách nhập nội dung bên dưới.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold flex items-center gap-2">
                  <MessageCircle className="w-3 h-3 text-blue-500" />
                  Hỏi đáp
                </div>
                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold flex items-center gap-2">
                  <Zap className="w-3 h-3 text-amber-500" />
                  Sáng tạo
                </div>
                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold flex items-center gap-2">
                  <FileText className="w-3 h-3 text-emerald-500" />
                  Phân tích tệp
                </div>
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 text-white shadow-md'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bitcoin className="w-5 h-5" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-md' : theme === 'dark' ? 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none shadow-sm' : 'bg-blue-50 text-slate-800 border border-blue-100 rounded-tl-none shadow-sm'}`}>
                {msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    alt="User upload" 
                    className="mb-2 rounded-lg max-w-[200px] max-h-[150px] object-contain shadow-lg cursor-pointer hover:opacity-90 transition-opacity" 
                    onClick={() => setSelectedImageForModal(msg.imageUrl!)}
                  />
                )}
                {(msg as any).fileName && (
                  <div className={`flex items-center gap-2 p-2 rounded-lg mb-3 ${theme === 'dark' ? 'bg-slate-700' : 'bg-white border border-blue-100'}`}>
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span className="text-xs truncate">{(msg as any).fileName}</span>
                  </div>
                )}
                <div className={`markdown-body prose prose-sm max-w-none text-[13px] leading-relaxed ${theme === 'dark' ? 'prose-invert text-slate-200' : 'prose-slate text-slate-800'}`}>
                  <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</Markdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 text-white shadow-md">
                <Bitcoin className="w-5 h-5" />
              </div>
              <div className="rounded-2xl rounded-tl-none p-4 flex items-center gap-3 shadow-sm border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-full h-full border-2 border-amber-500/20 border-t-amber-500 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                      className="w-1 h-1 bg-amber-500 rounded-full"
                    />
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0.3 }}
                      className="w-1 h-1 bg-amber-500 rounded-full"
                    />
                  </div>
                </div>
                <span className="text-slate-500 text-sm font-bold tracking-tight">AI CRYPTO đang xử lý...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {(selectedImage || selectedFile) && (
          <div className={`px-4 py-2 border-t flex items-center gap-3 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-blue-50/50 border-blue-100'}`}>
            {selectedImage && (
              <div className={`relative w-16 h-16 rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-slate-700' : 'border-blue-200'}`}>
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={removeImage} className="absolute top-0 right-0 bg-rose-500 text-white p-0.5 rounded-bl-lg hover:bg-rose-600 transition-colors"><X className="w-3 h-3" /></button>
              </div>
            )}
            {selectedFile && (
              <div className={`relative px-3 py-2 rounded-lg border flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-blue-200'}`}>
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-medium truncate max-w-[100px]">{selectedFile.name}</span>
                <button onClick={removeFile} className="text-rose-500 hover:text-rose-600"><X className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}

        <div className={`p-4 border-t transition-colors duration-300 ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-blue-100'}`}>
          <div className="flex items-end gap-2 max-w-6xl mx-auto">
            <div className={`flex-1 border rounded-2xl flex flex-col focus-within:ring-2 focus-within:ring-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Nhập câu hỏi hoặc dán code tại đây..."
                className={`w-full bg-transparent border-none rounded-2xl px-4 py-3 resize-none max-h-32 focus:ring-0 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}
                rows={1}
                disabled={isLoading}
              />
              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex gap-1">
                  <button onClick={startCamera} title="Chụp ảnh" className={`p-2 transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`}><Camera className="w-5 h-5" /></button>
                  <button onClick={() => fileInputRef.current?.click()} title="Gửi ảnh" className={`p-2 transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-blue-400' : 'text-slate-500 hover:text-blue-600'}`}><ImageIcon className="w-5 h-5" /></button>
                  <button onClick={() => docInputRef.current?.click()} title="Gửi tệp" className={`p-2 transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-blue-400' : 'text-slate-500 hover:text-blue-600'}`}><Paperclip className="w-5 h-5" /></button>
                  <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                  <input type="file" ref={docInputRef} onChange={handleFileSelect} accept=".pdf,.txt,.doc,.docx,.md,.js,.ts,.py,.cpp,.java" className="hidden" />
                </div>
                <button onClick={handleSend} disabled={(!input.trim() && !selectedImage && !selectedFile) || isLoading} className={`p-2 rounded-xl transition-all ${(!input.trim() && !selectedImage && !selectedFile) || isLoading ? 'text-slate-300' : 'text-white bg-blue-600 hover:bg-blue-700 shadow-lg'}`}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
                {isLoading && (
                  <button 
                    onClick={stopGeneration} 
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                    title="Dừng trả lời"
                  >
                    <StopCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
