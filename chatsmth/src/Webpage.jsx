import { useState,useEffect} from "react";
import "./App.css"

import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'; 

import { format, set } from 'date-fns';
import * as dateFnsTz from 'date-fns-tz'

import io from "socket.io-client";
import EmojiPicker from "emoji-picker-react";
import folderImage from './assets/folder.png';
import default_1 from './assets/default_1.jpg';
import default_2 from './assets/tab.png';
import default_3 from './assets/logout.png';
import default_4 from './assets/gear.png';
import default_5 from './assets/happy-face.png';
import default_6 from './assets/plus.png';
import default_7 from './assets/send.png';
import default_8 from './assets/team.png';
import default_9 from './assets/archive.png';
import default_10 from './assets/add-folder.png';
import default_11 from './assets/upload-big-arrow.png';
import default_12 from './assets/add-image.png'
// --- Configuration ---
const API_URL = 'http://localhost:8000'; 



function FullscreenPreview({ file, onClose, API_URL }) {
  if (!file) return null;

  const token = localStorage.getItem('token'); 

  const fileUrl = `${API_URL}/materials/download/${file.id}?token=${token}`;

  const isImage = file.file_type.startsWith('image/');
  const isVideo = file.file_type.startsWith('video/');

  return (
      <div className="fullscreen-overlay" onClick={onClose}>
          <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-preview-btn" onClick={onClose}>×</button>
              <h2>{file.filename}</h2>
              
              {isImage && <img src={fileUrl} alt={file.filename} style={{ maxWidth: '800px', maxHeight: '500px' }} />}
              
              {isVideo && (
                  <video controls style={{ maxWidth: '90%', maxHeight: '90%' }}>
                      <source src={fileUrl} type={file.file_type} />
                      Your browser does not support the video tag.
                  </video>
              )}
              
              {!isImage && !isVideo && (
                  <p>File type not supported for preview. <a href={fileUrl} target="_blank" rel="noopener noreferrer">Download here</a>.</p>
              )}
          </div>
      </div>
  );
}
function Course({ text, onClick, profile, onDelete, onChangeProfile,onLeave,onInvite }) {
  const [showPopup, setShowPopup] = useState(false); 
  const togglePopup = () => {
    setShowPopup(!showPopup); 
  };

  return (
    <>
      <div className="courseroomselection">
        <button className="settingcourseroom" onClick={togglePopup}>
          <img className="gearcourse" src={default_4} alt="" style={{maxWidth:"22px", transform:"translateY(4px)"}}/>
        </button>
        <div className="hello" onClick={onClick}>
          <div className="overlayhello" style={{textAlign:"center"}}>{text}</div>
          <div
            className="hellobg"
            style={{
              backgroundImage: profile,
              backgroundSize: "125px",
              backgroundRepeat: "no-repeat",
            }}
          ></div>
        </div>
      </div>

      {/* Popup for settings */}
      {showPopup && (
        <div className="popup">
          <button
            className="popup-option"
            onClick={() => {

              onDelete(); // Call the delete function
              setShowPopup(false); // Close the popup
            }}
          >
            Delete Room
          </button>
          <button
            className="popup-option"
            onClick={() => {

              onChangeProfile(); // Call the change profile function
              setShowPopup(false); // Close the popup
            }}
          >
            Change Profile
          </button>
          <button
            className="popup-option"
            onClick={() => {
              onLeave();
              setShowPopup(false); 
            }}
          >
            Leave
          </button>
          <button
            className="popup-option"
            onClick={() => {
              onInvite();
              setShowPopup(false);
            }}
          >
            Invite
          </button>
        </div>
      )}
    </>
  );
}

function NewFolder({text,onClick,onContextMenu}){ 
  return (
   <div className="folderstyle" onClick={onClick} onContextMenu={onContextMenu}>
     <img className="folderimg" src={folderImage} alt="Folder"></img>
     <div className="foldername">{text}</div>
   </div>
  );
}


// --- Main Components ---

export function Someth() {


  function Materials({ onClose }) {

    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [folderContents, setFolderContents] = useState({ files: [], folders: [] });
    const [breadcrumbs, setBreadcrumbs] = useState([{ name: 'Root', id: null }]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [folderCreationStatus, setFolderCreationStatus] = useState('');
    const token = localStorage.getItem('token');
    const [previewContent, setPreviewContent] = useState(null);
    const [showinputfoldername, setShowinputfoldername] = useState(false);
    const [showPopup, setShowPopup] = useState(false);

    

    const handlePreviewClick = (file) => {
      const isPreviewable = file.file_type.startsWith('image/') || file.file_type.startsWith('video/');
      if (isPreviewable) {
          setPreviewContent(file);
      } else {
  
          window.open(`${API_URL}/materials/download/${file.id}`, '_blank');
      }
    };
    const loadFolderContents = async (folderId) => {
      if (!selectedRoomId) return; 
      
    
      const url = `${API_URL}/materials/folder/contents?room_id=${selectedRoomId}${folderId ? `&folder_id=${folderId}` : ''}`;
      
      try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
          const data = await response.json();
          setFolderContents(data);
          setCurrentFolderId(folderId);
        } else {
 
          console.error("Failed to load folder contents, check auth.", await response.text());
          setFolderContents({ files: [], folders: [] });
        }
      } catch (error) {
        console.error("Network error loading folder contents:", error);
      }
    };
    
    useEffect(() => {
      if (selectedRoomId) {
        loadFolderContents(null); 
        setBreadcrumbs([{ name: 'Root', id: null }]);
      }
    }, [selectedRoomId]);
    
    const handleFolderNavigation = (folder) => {
      if (folder.id === null) {
        setBreadcrumbs([{ name: 'Root', id: null }]);
      } else {
        const existingIndex = breadcrumbs.findIndex(b => b.id === folder.id);
        if (existingIndex !== -1) {
          setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
        } else {
          setBreadcrumbs([...breadcrumbs, folder]);
        }
      }
      loadFolderContents(folder.id);
    };
 const handleFileChangeAndUpload = (e) => {
      const file = e.target.files[0];
      if (file) {

          setSelectedFile(file); 
          handleUpload(file); 
      }
      e.target.value = null; 
  };

const handleUpload = async (fileToUpload) => {
    if (!fileToUpload) {
        setUploadStatus("Please select a file.");
        return;
    }
    
    setUploadStatus("Uploading...");

    const formData = new FormData();
    formData.append('file', fileToUpload); 
    
    if (currentFolderId) {
        formData.append('parent_folder_id', currentFolderId);
    }
    
    try {
        const uploadUrl = `${API_URL}/materials/upload?room_id=${selectedRoomId}`;
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        let data;
        try {
            data = await uploadResponse.json();
        } catch (e) {
            if (!uploadResponse.ok) throw new Error(`Server responded with status: ${uploadResponse.status}`);
        }

        if (!uploadResponse.ok) {
            let errorMessage = "Upload failed: An unknown error occurred.";
            
            if (data && data.detail) {
                if (typeof data.detail === 'string') {
                    errorMessage = data.detail;
                } else if (Array.isArray(data.detail) && data.detail.length > 0) {
                    const firstError = data.detail[0];
                    if (firstError.msg && firstError.loc) {
                        errorMessage = `Validation Error: ${firstError.msg}. Check field: ${firstError.loc.slice(-1)}`;
                    } else {
                        errorMessage = "A detailed validation error occurred.";
                    }
                }
            } else if (uploadResponse.status === 401) {
                errorMessage = "Not Authorized. Please check your token.";
            }

            throw new Error(errorMessage);
        }
        
        setUploadStatus(`Success! File uploaded.`);
        loadFolderContents(currentFolderId);
    } catch (error) {
        setUploadStatus(`Upload Failed: ${error.message}`); 
    }
};


    const handleCreateFolder = async (e) => {
      e.preventDefault();
      const folderName = newFolderName.trim();
      if (!folderName) return;
      setFolderCreationStatus("Creating folder...");
  
      const payload = {
          name: folderName,
          parent_folder_id: currentFolderId,
      };
  
      try {
          const createUrl = `${API_URL}/materials/folder/create?room_id=${selectedRoomId}`;
          const response = await fetch(createUrl, {
              method: 'POST',
              headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json' 
              },
              body: JSON.stringify(payload),
          });
          

          const data = await response.json(); 
          

          if (!response.ok) {

              throw new Error(data.detail || 'Folder creation failed with an unknown error.'); 
          }
  
          setFolderCreationStatus(`Folder '${folderName}' created.`);
          setNewFolderName('');
          loadFolderContents(currentFolderId);
      } catch (error) {

          setFolderCreationStatus(`Creation Failed: ${error.message}`); 
      }
    };

    const stateinputfoldername = () => {
      setShowinputfoldername(!showinputfoldername);
    };

    const handleDeleteFile = async (fileId) => {
      if (!window.confirm("Are you sure you want to delete this file?")) return;
      
      setUploadStatus("Deleting file..."); 
      
      try {
          const response = await fetch(`${API_URL}/materials/delete/file/${fileId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
  
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.detail || `Server returned status ${response.status}`);
          }
  
          setUploadStatus("File deleted successfully!");
          loadFolderContents(currentFolderId); // Refresh the folder view
  
      } catch (error) {
          setUploadStatus(`Deletion Failed: ${error.message}`);
      }
  };
  
  
  const handleDeleteFolder = async (folderId, folderName) => {
      if (!window.confirm(`Are you sure you want to delete the folder "${folderName}"? This will delete all contents inside.`)) return;
      
      setFolderCreationStatus("Deleting folder..."); // Reuse the folder status state
  
      try {
          const response = await fetch(`${API_URL}/materials/delete/folder/${folderId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
  
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.detail || `Server returned status ${response.status}`);
          }
  
          setFolderCreationStatus("Folder deleted successfully!");
          loadFolderContents(currentFolderId); // Refresh the folder view
  
      } catch (error) {
          setFolderCreationStatus(`Deletion Failed: ${error.message}`);
      }
  };
  const [Targetfolder, setTargetfolder] = useState(null);
  const [Targetfile, setTargetfile] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [checkfolder,setCheckfolder] = useState(false);
  const handleDeleteRC = (e,data,type) => {
    e.preventDefault();

    if (type === 'folder'){
      setCheckfolder(true);
      setShowPopup(true);
      setTargetfolder(data);
      setPopupPosition({ 
        x: e.clientX -250, 
        y: e.clientY 
      })
    }
    else if (type === 'file'){
      console.log(data)
      setShowPopup(true);
      setTargetfile(data);
      setPopupPosition({
        x: e.clientX -250,
        y: e.clientY
      })
    }
      
    
  };
    return (

      <>

           {showPopup && (
            <>
              {/*popup ui */}
              <div className="popup" style={{ top: popupPosition.y, left: popupPosition.x, position: 'absolute' }}>
                    <button
                      className="popup-option"
                      onClick={() => {
                        if(checkfolder){
                          handleDeleteFolder(Targetfolder.id, Targetfolder.name);
                          setCheckfolder(false);
                        }
                        else{
                          handleDeleteFile(Targetfile.id);
                        }
                        
                      }}
                    >
                      Delete this
                    </button>
              </div>

              <div style={{width:"100vw",height:"100vh",zIndex:'998',position: 'fixed'}} onClick={() => {
                setShowPopup(false)
                setCheckfolder(false);
                }}>
                  
              </div>
            
            </>
            
            
           )}
          <div className="materials-panel-overlay" >
          <div className="infolder" style={{display: 'flex'}}>
              <button className="folderbutton" onClick={stateinputfoldername} >
                <img src={default_10} alt=""style={{maxWidth:"40px"}}></img>
              </button>
              <form onSubmit={handleCreateFolder} className="create-folder-form" style={{ display: showinputfoldername ? 'block' : 'none' ,transform:"translateY(10px)"}}>
                <input
                  type="text" 
                  value={newFolderName} 
                  onChange={(e) => setNewFolderName(e.target.value)} 
                  placeholder="New Folder Name"
                  required
                  style={{ borderRadius: '4px', padding: '5px', marginRight: '10px', border: 'none'}}
                />
                <button type="submit" style={{ borderRadius: '4px', padding: '5px', marginRight: '10px', border: 'none', backgroundColor:"rgb(255, 167, 43)", color:'white'}}>Create</button>
                
              </form>
              <input
                    type="file" 
                    id="materials-file-input" 
                    onChange={(e) => setSelectedFile(e.target.files[0])} 
                    style={{ display: 'none' }}
              />
              <button className="uploadbutton" onClick={() => document.querySelector('.inputmaterialfile').click()} >
                <img src={default_11} alt=""style={{maxWidth:"40px"}}></img>
                <input type="file" className="inputmaterialfile" style={{display:"none" }}onChange={handleFileChangeAndUpload}></input>

              </button>
              
          </div>
          <div className="materials-forms-container">
            <div className="materials-panel" onClick={(e) => e.stopPropagation()} >
            
                

              </div>
              
              <div className="breadcrumbs">
                {breadcrumbs.map((crumb) => (
                  <span key={crumb.id || 'root'}>
                    <button  className="crumb-link" onClick={() => handleFolderNavigation(crumb)} disabled={crumb.id === currentFolderId}>
                      <strong>{crumb.name}</strong>
                    </button>
                    {' > '}
                  </span>
                ))}
              </div>

              <div className="folder-grid-container">
                {/* Display Folders */}
                {folderContents.folders.map(folder => (
                 <NewFolder
                    key={folder.id} 
                    text={folder.name}
                    onClick={() => handleFolderNavigation({ name: folder.name, id: folder.id })}
                    onContextMenu={(e) => handleDeleteRC(e,folder,'folder')}
                 />
                ))}

                {/* Display Files */}
               {folderContents.files.map(file => {
                    const isPreviewable = file.file_type.startsWith('image/') || file.file_type.startsWith('video/');
                    const icon = isPreviewable ? '👀' : '📄';
                    const fileUrl = `${API_URL}/materials/download/${file.id}`;
                    
                    return (
                        <div 
                            key={file.id} 
                            className="fileitemstyle" 
                            onClick={
                              () => {
                                if(icon){
                                  handlePreviewClick(file)}
                                }}
                            onContextMenu={(e) => handleDeleteRC(e,file,'file')}
                            style={{ cursor: isPreviewable ? 'pointer' : 'default' }}
                        >
                          <div style={{display: "flex",alignItems: "center",fontFamily: 'Trebuchet MS, sans-serif'}}>
                            <p>{icon} <strong>{file.filename} </strong></p>
                            <small style={{opacity:'50%'}}>.By: {file.user} on {new Date(file.timestamp).toLocaleDateString()} </small>
            
                          </div>
                            
                        </div>
                    );
                })}

             
               </div>
              
            
              
              
            </div>
            {previewContent && (
                <FullscreenPreview 
                    file={previewContent} 
                    onClose={() => setPreviewContent(null)} 
                    API_URL={API_URL}
                />
            )}
          </div>
      
      </>
       
     
    );
  }
  // --- END OF MATERIALS COMPONENT ---

  const [boxes, setBoxes] = useState([]);
  const navigate = useNavigate();
  const handleLogout = () => {

    localStorage.removeItem('token');
    localStorage.removeItem('username');

    navigate('/login'); 
  };

  const handleJoinLeaveRoom = async (roomId, action) => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("You must be logged in to change room membership.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/chat/room/${roomId}/${action}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message);

        } else {
            alert(`Failed to ${action} room: ${data.detail || data.message}`);
        }
    } catch (error) {
        console.error(`Error during room ${action}:`, error);
        alert(`Network error during room ${action}.`);
    }
  }

  const deleteRoom = (id) => {
    setBoxes(boxes.filter((box) => box.id !== id));
    handleDeleteRoom(id) // Remove the room from the state
  };

  const changeRoomProfile = async (roomId, newProfileFile) => {
    while (!newProfileFile) {
      alert("Please select an image file.");
      
    }
    
    
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    
    let profileUrl = null;

    // 1. UPLOAD NEW FILE
    const formData = new FormData();
    formData.append('file', newProfileFile);

    try {
   
        const uploadRes = await fetch(`${API_URL}/files/upload/generic`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok || !uploadData.file_url ) {
            throw new Error(uploadData.detail || 'File upload failed');
        }
        profileUrl = uploadData.file_url ; // Construct full URL
    } catch (error) {
        console.error("Upload error:", error);
        alert(`Error uploading new profile image: ${error.message}`);
        return;
    }

    // 2. UPDATE ROOM PROFILE URL
    try {
        
        const response = await fetch(`${API_URL}/rooms/update/${roomId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ profile_url: profileUrl }),
        });

        if (response.ok) {
            alert("Room profile updated successfully!");
            await fetchRooms(); // Refresh the room list to show the new image
        } else {
            const errorData = await response.json();
            alert(`Failed to update profile: ${errorData.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Network error while updating profile.");
    }
};



  const [roomtitle, setRoomtitle] = useState('');
  const [coursename,setCoursename] = useState('');
  const [active, setActive] = useState(false);
  const [activefolderpopup, setActivefolderpopup] = useState(false);
  const [activeoverlay, setActiveoverlay] = useState(false);
  const [imgSrc,setimgSrc] = useState(null);
  const [memberspage_state,setMemberspage_state] = useState(false);
  const [members,setMembers] = useState([]);
  const [materialspage_state,setMaterialspage_state] = useState(false);
  const [folders,setFolders] = useState([]);
  const [foldersname,setFoldersname] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState(""); 
  const [socket, setSocket] = useState(null); // WebSocket connection
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); 
  const [selectedFile, setSelectedFile] = useState(null); 
  const [popupIndex, setPopupIndex] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const [chatByRoom, setChatByRoom] = useState({}); 
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [profileUrl, setProfileUrl] = useState('');

  const [filePreview, setFilePreview] = useState(null); 
  const [fileType, setFileType] = useState(null); 
  const [roomProfileFile, setRoomProfileFile] = useState(null);
  const [activeRoomIdToEdit, setActiveRoomIdToEdit] = useState(null); 
  const [inputmessage, Setinputmessage] = useState("");
  const [invitepopup_state, setInvitepopup_invite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [popupmemberindex, setPopupmemberindex] = useState(false);

  const handleProfileEditClick = (roomId) => {
      setActiveRoomIdToEdit(roomId); 
      document.getElementById('profile-upload-input').click(); 
  };

  const handleFileSelection = (event) => {
      const file = event.target.files[0];
      if (file && activeRoomIdToEdit) {
          changeRoomProfile(activeRoomIdToEdit, file); 
      }
      
      setActiveRoomIdToEdit(null);
      event.target.value = null; 
  };

const uploadFileAndSendMessage = async (roomName) => {
  const token = localStorage.getItem('token');
  if (!selectedRoomId || !selectedFile || !token) return;

  // 1. UPLOAD FILE TO API
  const formData = new FormData();
  formData.append('file', selectedFile);

  let fileReference = null;

  try {
      const uploadResponse = await fetch(`${API_URL}/files/upload/${roomName}`, {
          method: 'POST',
          headers: {
              // NOTE: Do NOT set 'Content-Type' for FormData; the browser handles it.
              'Authorization': `Bearer ${token}`,
          },
          body: formData,
      });

      if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(`Upload failed: ${errorData.detail || 'Unknown error'}`);
      }

      const uploadResult = await uploadResponse.json();
      // ASSUMPTION: The server returns a reference ID or URL to the file.
      fileReference = uploadResult.file_id || uploadResult.file_url; 

  } catch (error) {
      console.error("Error during file upload:", error);
      alert("Failed to upload file.");
      return;
  }

  // 2. CONSTRUCT AND SEND STRUCTURED JSON MESSAGE
  const structuredMessage = {
      user: localStorage.getItem('username'),
      content: inputmessage.trim(),
      fileReference: fileReference, // The reference ID/URL
      filePreview: filePreview,
      fileType: fileType,
      fileName: selectedFile.name,
      ts: Date.now(), // Local timestamp, server should override this
  };

  if (socket && socket.readyState === WebSocket.OPEN) {
      try {
          // CRITICAL: Send the structured object as a JSON string
          socket.send(JSON.stringify(structuredMessage));
          
          // Clear states
          Setinputmessage("");
          setSelectedFile(null);
          setFilePreview(null);
          setFileType(null);
      } catch (error) {
          console.error("Error sending JSON message via WebSocket:", error);
          alert("Failed to send message.");
      }
  }
};

  const fetchRooms = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        navigate('/login');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/rooms/list`, { 
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            console.log(data)
            setBoxes(data); 
            
            // Initialize chat history state structure
            setChatByRoom(prev => {
                const newChatState = { ...prev };
                data.forEach(box => {
                    if (!newChatState[box.id]) {
                        newChatState[box.id] = [];
                    }
                });
                return newChatState;
            });

        } else {
            console.error("Failed to fetch user's rooms:", await response.json());
            if (response.status === 401) navigate('/login');
        }
    } catch (error) {
        console.error("Network error fetching rooms:", error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file); 
      setSelectedFile(file);
      setFilePreview(previewUrl);
      setFileType(file.type.split("/")[0]); 
    }
  };

  

  const sendMessage = (event) => {
    event.preventDefault();
    
    const messageText = newMessage.trim(); 
    
    if (selectedRoomId === null) return;
    
    if (selectedFile) {
        uploadFileAndSendMessage(roomtitle);
        return;
    }
    
    if (messageText === "") {
        return;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
        try {
            
            const textMessagePayload = {
                user: localStorage.getItem('username'), 
                content: messageText, 
            };

            socket.send(JSON.stringify(textMessagePayload)); 
            Setinputmessage(""); // Clear the input field
        } catch (error) {
            console.error("Error sending message via WebSocket:", error);
            alert("Failed to send message.");
        }
    }
    setNewMessage(""); 
  };

  const deleteMessage = (index) => {
    setChatMessages(chatMessages.filter((_, i) => i !== index)); 

  };
  const handleDeleteMessage = async (messageId, roomName,index) => {
    console.log("Deleting message with ID:", messageId);
    console.log("From room:", index);
    if (!window.confirm("Are you sure you want to delete this message?")) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/chat/message/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
  
            const errorMessage = errorData.detail || 'An unknown error occurred during deletion.';
            throw new Error(`Deletion failed: ${errorMessage}`);
        }


        setChatMessages(prevMessages => 
            prevMessages.filter(msg => msg.id !== messageId)
        );
        

        setChatByRoom(prevChatByRoom => {
            if (!prevChatByRoom[selectedRoomId]) return prevChatByRoom;
            const updatedRoomMessages = prevChatByRoom[selectedRoomId].filter(msg => msg.id !== messageId);
            return { ...prevChatByRoom, [selectedRoomId]: updatedRoomMessages };
        });


        if (socket && socket.readyState === WebSocket.OPEN) {
            const deleteNotification = {
                command: "MESSAGE_DELETED", 
                message_id: messageId,
                room_name: roomName 
            };
            socket.send(JSON.stringify(deleteNotification));
        }

    } catch (error) {

        console.error("Error deleting message:", error.message); 
        alert(`Error: ${error.message}`);
    }
};
  const editMessage = (index, newContent) => {
    const updatedMessages = [...chatMessages];
    updatedMessages[index].content = newContent; 
    setChatMessages(updatedMessages);
  };

  const handleEmojiClick = (emojiObject) => {
    setNewMessage((prevMessage) => prevMessage + emojiObject.emoji); 
    setShowEmojiPicker(false); 
  };

  const addBox = async () => {
    if (coursename !== "") {
      let profileUrl = null;
      const token = localStorage.getItem('token');
      console.log(localStorage.getItem('token'));
        if (!token) return navigate('/login');
        if (roomProfileFile) {
          const formData = new FormData();
          formData.append('file', roomProfileFile);
          try {
      
              const uploadRes = await fetch(`${API_URL}/files/upload/generic`, {
                  method: 'POST',
                  headers: {
                      'Authorization': `Bearer ${token}`,
                  },
                  body: formData, 
              });
              const uploadData = await uploadRes.json();
              
              if (!uploadRes.ok || !uploadData.file_url) {
                  alert(`File upload failed: ${uploadData.detail || 'Unknown upload error.'}`);
                  return;
              }

              profileUrl = uploadData.file_url; 
          } catch (error) {
              console.error("Upload error:", error);
              alert("Error uploading profile image.");
              return;
          }
      }

      try {
        const response = await fetch(`${API_URL}/rooms/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify({ 
                name: coursename,
                profile_url: profileUrl, 
            }),
        });

        if (response.ok) {
            await fetchRooms(); 
            setActive(false); 
            setActiveoverlay(false);
            setCoursename("");
            setProfileUrl("");
            setimgSrc(null);
            setRoomProfileFile(null); 
        } else {
            const errorData = await response.json();
            alert(`Failed to create room: ${errorData.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Error creating room:", error);
        alert("Network error while creating room.");
    }
    }
  };

  const selectRoom = (roomId, roomName) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close(1000, "Switching room"); 
        setSocket(null);
    }
    
    setChatMessages([]);
    Setinputmessage("");
    setSelectedFile(null);
    setFilePreview(null);
    
    setSelectedRoomId(roomId); 
    setRoomtitle(roomName); 
  };
  useEffect(() => {
      if (selectedRoomId === null || !roomtitle) return;
      
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');


      const wsUrl = `${API_URL.replace('http', 'ws')}/chat/${roomtitle}?token=${token}`; 
      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
          console.log(`Connected to chat room: ${roomtitle}`);
      };

      newSocket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          
          setChatByRoom(prev => {
              const roomMessages = prev[selectedRoomId] || [];
              
              const fileUrl = message.fileReference 
                  ? `${API_URL}/files/download/by_id/${message.fileReference}` 
                  : null;
                  
              const cleanFileType = message.fileType ? message.fileType.split("/")[0] : null;

              const updatedMessages = [...roomMessages, {
                  id: message.id,
                  user: message.user,
                  content: message.content,
                  ts: message.timestamp,
                  file: fileUrl, 
                  fileName: message.fileName,
                  fileType: cleanFileType,
              }];
              
              setChatMessages(prevChatMessages => {return updatedMessages;}); 
              return { ...prev, [selectedRoomId]: updatedMessages };
          });
      };

      newSocket.onclose = (event) => {
          console.log(`Disconnected from chat room: ${roomtitle}. Code: ${event.code}. Reason: ${event.reason}`);
      };

      newSocket.onerror = (error) => {
          console.error("WebSocket Error:", error);
      };

      setSocket(newSocket);

      return () => {
          if (newSocket.readyState === WebSocket.OPEN) {
              newSocket.close(1000, "Effect cleanup");
          }
      };

  }, [selectedRoomId, roomtitle, API_URL]);


  const handleDeleteRoom = async (roomId) => {
    
    if (!window.confirm("Are you sure you want to delete this room? This cannot be undone.")) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    try {
        const response = await fetch(`${API_URL}/rooms/delete/${roomId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            alert("Room deleted successfully!");
            await fetchRooms(); // Refresh the list of rooms
        } else {
            const errorData = await response.json();
            alert(`Failed to delete room: ${errorData.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Error deleting room:", error);
        alert("Network error while deleting room.");
    }
  };
  


  const addfolder = () => {
      if (coursename == ''){
        setCoursename('New_folder');
      }
      if (coursename != ''){
        setFolders([...folders,{text:coursename}]);
        setActiveoverlay(!activeoverlay);
        setActivefolderpopup(!activefolderpopup);
        setCoursename('');
        
      }
    }
    const memberspage = () => {
        setMemberspage_state(!memberspage_state);
        if(materialspage_state == true){
          setMemberspage_state(!materialspage_state);
        }
        if(memberspage_state == true){
          fetchRoomMembers(selectedRoomId);
        }
        
       
        
    };
    const fetchRoomMembers = async (roomId) => {
     
  
      const token = localStorage.getItem('token');
      
      try {
          const response = await fetch(`${API_URL}/chat/room/${roomId}/members`, {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          });
  
          if (!response.ok) {
              const errorData = await response.json();
              console.error("Failed to fetch members:", errorData.detail);
              setMembers([]); 
              return;
          }
  
          const membersData = await response.json();
          console.log(membersData);
          setMembers(membersData);
          
  
      } catch (error) {
          console.error("Network error fetching members:", error);
          setMembers([]);
      }
  };
  
    const materialspage = () => {
        setMaterialspage_state(!materialspage_state);
        if(memberspage_state == true){
          setMemberspage_state(!memberspage_state);
        }
    }
    const preBox = () => {
      setActive(!active);
      setActiveoverlay(!activeoverlay);
    }
    const preFolder = () => {
      setActivefolderpopup(!activefolderpopup);
      setActiveoverlay(!activeoverlay);
    }
    const changetitleroom = (e) => {
      setRoomtitle(e.target.innerText);
    };
    const changefoldername = (e) => {
      setFoldersname(foldersname);
    }

    const invitepopup = () => {
      setInvitepopup_invite(!invitepopup_state);
      setActiveoverlay(!activeoverlay);
    };
    const handleInviteUser = async (e, roomId) => {
      e.preventDefault();
      if (!inviteUsername.trim() || !roomId) return;
  
      const token = localStorage.getItem('token');
      
      try {
          const response = await fetch(`${API_URL}/chat/room/${roomId}/invite`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ username: inviteUsername.trim() })
          });
  
          const data = await response.json();
  
          if (response.ok) {
              alert(data.message);
              setInviteUsername('');
          } else {
              alert(`Invite Failed: ${data.detail || data.message}`);
          }
      } catch (error) {
          console.error("Error inviting user:", error);
          alert("Network error during invite.");
      }
  };
  const handleKickMember = async (targetUserId, roomName, roomId) => {
    if (!window.confirm(`Are you sure you want to kick this member from ${roomName}?`)) {
        return;
    }
    console.log(targetUserId, roomName, roomId);
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/chat/room/${roomId}/kick/${targetUserId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            alert(`Kick Failed: ${data.detail || 'An unknown error occurred.'}`);
            return;
        }

        alert(data.message);
        
        // Remove the user from the local state list immediately
        setRoomMembers(prevMembers => 
            prevMembers.filter(member => member.id !== targetUserId)
        );

    } catch (error) {
        console.error("Network error during kick:", error);
        alert("Network error during member kick.");
    }
  };
    {/* --- Effect --- */}
    useEffect(() => {
      fetchRooms();
     }, []);


      return(
        <>
          <input 
              type="file" 
              id="profile-upload-input" 
              accept="image/*"
              style={{ display: 'none' }} // Crucial: Hides the default browser button
              onChange={handleFileSelection} // This runs AFTER the user picks a file
          />


          <div className="createroompopup" style={{display: active ? "block" : "none"}}>
            <h1 className="title">Create Course</h1>
            <h2 className="titlecn">Course name</h2>
            <input type="text" className="inputtext" placeholder="new_course" onChange={(e) => setCoursename(e.target.value)} value ={coursename}></input>

            <div class="roomseleprofile" onClick={() => document.querySelector('.inputpf').click()} style={{display:'flex',flexDirection:'column',justifyItems:'center',alignItems:'center'}}>
              {imgSrc && (
                <img
                  src={imgSrc}
                  alt="Preview"
                  style={{ width: "80%", height: "80%", marginTop: "20px",zIndex:15,borderRadius:'10px',objectFit: 'contain'}}
                />
              )}
              <img src={default_12} alt="" style={{maxWidth:'40px' ,opacity:'50%',position:"absolute",transform:"translate(0.5vw,17vh)", display: imgSrc ? 'none' : 'block'}}></img>
            </div>
            <input className = "inputpf" type="file" accept="image/*" style={{display:'none'}} onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const url = URL.createObjectURL(file);
                setimgSrc(url);
                setRoomProfileFile(file);
              
              } 
            }}></input>
            
            <button className="confirm" onClick={addBox}>Confirm</button>
          </div>
          
          <div className="invitepopup" style={{display: invitepopup_state ? "block" : "none"}}>
            <div className="inviteheader">
              <h1 className="title">Invite Members</h1>
              <button className="closeinvitemember" onClick={invitepopup}>X</button>
            </div>
            
            <form onSubmit={(e) => handleInviteUser(e, selectedRoomId)} className="invite-form" style={{marginLeft:'10px',marginTop:'15px'}}>
              <input
                  type="text"
                  placeholder="Username to invite"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  required
                  style={{borderRadius:"5px",fontSize:'15px',padding:'5px'}}
              />
              <button type="submit" style={{padding:'3.5px',marginLeft:'10px',borderRadius:"7.5px",fontSize:'20px',border:'none',backgroundColor:'rgb(255, 167, 43)',color:'white'}}>Invite</button>
            </form>
          </div>

          <div className="overlay" style={{display: activeoverlay ? "block" : "none"}} onClick={() => { 
            setActive(false);
            setInvitepopup_invite(false);
            setInviteUsername('');
            setRoomProfileFile(null);
            setCoursename('');
            setActiveoverlay(false);
            setimgSrc(null);
          }}></div>
          <div className="container">
            
            

            <div className="left">
              <div className="lefttopbar">
                <p style={{marginTop:"-31px"}}>EDU CHAT</p>
          
                
              </div>
              <div className="lefttopbar2">
                <button className="buildnewcourse" onClick={preBox}>
                  <img src={default_2} alt="" style={{maxWidth:"18px", transform:"translateY(2px)"}}/>
                </button>
                <button className="buildnewcourse" onClick={handleLogout}>
                  <img src={default_3} alt="" style={{maxWidth:"18px", transform:"translateY(2px)"}}/>
                </button>
              </div>
              <div className="roomelements">
                
                {boxes.map((box) => (
                  <Course
                    key={box.id}
                    text={box.name}
                    profile={`url("${box.profile_url || default_1}")`}
                    onClick={() => selectRoom(box.id, box.name)} // Call selectRoom to set the selected room
                    onDelete={() => deleteRoom(box.id)}
                    onChangeProfile={() => handleProfileEditClick(box.id)}
                    onLeave={() => handleJoinLeaveRoom(box.id, 'leave')}
                    onInvite={invitepopup}
                  />
                ))}
              </div>
                
              
            </div>
            <div className="draghomebar"></div>
            <div className="right">
                <div className="righttopbar">
                  <h2 className="roomtitle" style={{marginLeft:"10px"}}>{roomtitle}</h2>
                  <button className="materials" onClick={materialspage}>
                    <img src={default_9} alt="" style={{maxWidth:"28px", transform:"translateY(5px)"}}/>
                  </button>
                  <button className="members" onClick={memberspage}>
                    <img src={default_8} alt="" style={{maxWidth:"35px", transform:"translateY(5px)"}}/>
                  </button>
              
                  

                </div>
                <div className="memberspage" style={{display: memberspage_state ?  "block" : "none" }}>
                
                  {members.map((i)=>(
                    <div className="memberstyle" key={i.id}
                      onClick={() => {setPopupmemberindex(!popupmemberindex)}}>
                      {popupmemberindex && (
                          <div className="popup-menu">
                            <button
                              className="popup-option"
                              onClick={() => {
                                handleKickMember(i.id,roomtitle,selectedRoomId)// Delete the message
                                setPopupmemberindex(null); // Close the popup
                              }}
                            >
                              Kick
                            </button>
                           
                          </div>
                        )}
                      
                      <div className="membername">{i.username}</div>
                    </div>
                  ))}
                </div>
                <div className="materialspage" style={{display: materialspage_state ?  "block" : "none" }}>
                  
                  <div className="layout">
                    {materialspage_state && (
                      <Materials 
                          
                          selectedRoomId={selectedRoomId}
                          onClose={() => setMaterialspage_state(false)} // Pass the close handler
                      />
                    )}
                    
                  </div>
                </div>
                <div className="chat-container">
                 
                  <div className="chat-messages">
                    {chatMessages.map((msg, index) => (
                      <div
                        key={index}
                        className="chat-message"
                        style={{ marginBottom: "10px", position: "relative" }}
                        onContextMenu={(e) => {
                          e.preventDefault(); 
                          setPopupIndex(index); 
                        }}
                        onMouseLeave={() => setPopupIndex(null)} 
                      >
                        <strong style={{fontSize:"20px",fontFamily: 'Trebuchet MS, sans-serif'}}>{msg.user}</strong>
                        <div style={{display: "flex"}}>
                          <p style={{transform:"translateY(-30px)",maxWidth:"65vw", overflowWrap:"break-word",transform:"translateY(-10px)",fontFamily: 'Trebuchet MS, sans-serif'}}>{msg.content} </p>
                          <p style={{marginLeft:"10px",transform:"translateY(-12.5px)",opacity:"50%",fontFamily: 'Trebuchet MS, sans-serif'}}>({format(dateFnsTz.toZonedTime(msg.ts, 'Asia/Bangkok'), 'MMM dd, yyyy HH:mm', { timeZone: 'Asia/Bangkok'})})</p>
                          
                        </div>
                          
                        
                        
                        {msg.file && (
                          <div>
                            {msg.fileType === "image" && (
                              <img
                                src={msg.file}
                                alt={msg.fileName}
                                style={{ maxWidth: "300px", marginTop: "10px" ,borderRadius:"10px",cursor:"crosshair",boxShadow:"0 4px 8px rgba(0, 0, 0, 0.2)"}}
                                onClick={() => setModalImage(msg.file)}
                              />
                            )}
                            {msg.fileType === "video" && (
                              <video
                                src={msg.file}
                                controls
                                style={{ maxWidth: "300px", marginTop: "10px" ,borderRadius:"10px",cursor:"crosshair",boxShadow:"0 4px 8px rgba(0, 0, 0, 0.2)"}}
                              />
                            )}
                            {msg.fileType !== "image" && msg.fileType !== "video" && (
                              <a
                                href={msg.file}
                                download={msg.fileName}
                                style={{ display: "block", marginTop: "10px", color: "blue" }}
                              >
                                {msg.fileName}
                              </a>
                            )}
                          </div>
                        )}

                        {/* Popup Menu */}
                        {popupIndex === index && (
                          <div className="popup-menu">
                            <button
                              className="popup-option"
                              onClick={() => {
                                handleDeleteMessage(msg.id,selectedRoomId) 
                                setPopupIndex(null); 
                              }}
                            >
                              Delete
                            </button>
                          
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {modalImage && (
                    <div className="image-modal" onClick={() => setModalImage(null)}>
                      <div className="image-modal-content">
                        <img src={modalImage} alt="Full-size preview" />
                      </div>
                    </div>
                  )}
                </div> 
                  {/* File Preview */}
                  {filePreview && (
                    <div className="file-preview">
                      {fileType === "image" && (
                        <img
                          src={filePreview}
                          alt="Preview"
                          style={{ maxHeight: "200px", marginBottom: "10px" }}
                        />
                      )}
                      {fileType === "video" && (
                        <video
                          src={filePreview}
                          controls
                          style={{ maxHeight: "200px", marginBottom: "10px" }}
                        />
                      )}
                    </div>
                  )}

                <div className="inputarea"> 

                 
                  <div className="inputfile" onClick={() => document.querySelector('.inputfilereal').click()}>
                    <img src={default_6} alt="" className="inputfileimg" ></img>
                    <input type="file" className="inputfilereal" style={{display:"none" }}onChange={handleFileChange}></input>
                  </div>
                  <button
                    className="emoji"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)} // Toggle emoji picker visibility
                  >
                    <img src={default_5} alt="" className="emojiimg"></img>
                  </button>
                  
                  {showEmojiPicker && (
                    <div className="emoji-picker">
                      <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                  )}
                  <input className="inputtext" type="text" placeholder="Chatting :]" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}></input>
                  <button className="send" onClick={sendMessage}>
                    <img src={default_7} alt="" className="sendimg"></img>
                  </button>
                  
                </div>
            </div>
          </div>
          
        
          
        </>
      
      );
      
}


export function Login(){
    const [Username,SetUsername] = useState("");
    const [Password,SetPassword] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const navigate = useNavigate(); // Hook for redirection

    const handleLogin = async (e) => {
      e.preventDefault(); // Prevent default form submission
      setStatusMessage("Logging in...");
  
      // Use URLSearchParams to send form data
      const formBody = new URLSearchParams();
      formBody.append("username", Username);
      formBody.append("password", Password);
  
      try {
          const response = await fetch(`${API_URL}/users/login`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded', // Correct content type
              },
              body: formBody.toString(), // Send form data
          });
  
          const data = await response.json();
  
          if (response.ok) {
              setStatusMessage("Login successful!");
              console.log("Token:", data.access_token); // Log the token for debugging
              // Save the token to localStorage or state
              localStorage.setItem('token', data.access_token);
              // Redirect to another page
              navigate('/home');
          } else {
              setStatusMessage(`Login Failed: ${data.detail || 'An unknown error occurred.'}`);
          }
      } catch (error) {
          setStatusMessage("Network error during login.");
          console.error(error);
      }
  };

    return(
      <>
        <div className="LoginContainer">
           <div className="LoginBox">
              <h1 className="Logintext">Login</h1>
              {/* Form setup for Login */}
              <div>
                <input className="InputUsername" type="text" placeholder="Username" value={Username} 
                  onChange={(e) => SetUsername(e.target.value)} required></input>
              </div>
              <div>
                <input className="InputPassword" type="password" placeholder="Password" value={Password} 
                  onChange={(e) => SetPassword(e.target.value)} required></input>
              </div>
              <Link to="/register">
                <label className="RegisNow">Don't have account?? Register here!!</label>
              </Link>
                           
              {/* API call happens on button click */}
              <button className="buttonlogin" onClick={handleLogin}>Login</button> 
              <p className="statusMessage">{statusMessage}</p>

           </div>
        </div>
      </>
    );
}

export function Register(){
  const [Username,SetUsername] = useState("");
  const [Password,SetPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState(""); // State for feedback
  const navigate = useNavigate(); // Hook for redirection

  const handleRegister = async (e) => {
    e.preventDefault(); // Prevent default form submission redirect
    setStatusMessage("Registering...");

    // Use URLSearchParams to send form data
    const formBody = new URLSearchParams();
    formBody.append("username", Username);
    formBody.append("password", Password);

    try {
        const response = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded' // Correct content type
            },
            body: formBody.toString() // Send form data
        });

        const data = await response.json();

        if (response.ok) {
            setStatusMessage("Registration successful! Redirecting to login...");
            setTimeout(() => navigate('/login'), 1500);
        } else {
            setStatusMessage(`Registration Failed: ${data.detail || 'An unknown error occurred.'}`);
        }
    } catch (error) {
        setStatusMessage("Network error during registration.");
        console.error(error);
    }
  };  

  return(
    <>
      <div className="LoginContainer">
         <div className="LoginBox">
            <div>
              <Link to="/login">
                <button className="BackloginButton">Back to Login</button>
              </Link>{" "}
              <h1 className="Registertext">Register</h1>
            </div>
            
            <form onSubmit={handleRegister}> {/* Use onSubmit to handle form submission */}
                <div>
                  <input className="InputUsername" type="text" placeholder="Username" value={Username}
                  onChange={(e) => SetUsername(e.target.value)} required></input>
                </div>
                <div>
                  <input className="InputPassword" type="password" placeholder="Password" value={Password}
                  onChange={(e) => SetPassword(e.target.value)} required></input>
                </div>      
                {/* button type="submit" within a form will trigger handleRegister */}
                <button type="submit" className="buttonlogin">Register</button>
            </form>
            <p className="statusMessage">{statusMessage}</p>
         </div>
      </div>
    </>
  );
}