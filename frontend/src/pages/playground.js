import { useRef, useState, useEffect } from 'react';
import styles from '../styles/playground.module.css';
import Image from 'next/image';
import { searchData } from '../utils/searchUtils';
import dynamic from 'next/dynamic';
import Filter from '../components/Filter';
import AddTab from "../components/AddTab";
import GraphInfoDisplay from '../components/GraphInfoDisplay';
import { TbCrosshair, TbTrash } from 'react-icons/tb';

// 动态加载 GraphComponent
const DrawGraph = dynamic(() => import('../components/DrawGraph'), { ssr: false });

export default function Playground() {
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDatabaseMenuOpen, setIsDatabaseMenuOpen] = useState(false);
  const [protocol, setProtocol] = useState('bolt://');
  const [connectUrl, setConnectUrl] = useState('');
  const [serverUsername, setServerUsername] = useState('');
  const [serverPassword, setServerPassword] = useState('');
  const [openSettingsIndex, setOpenSettingsIndex] = useState(null);
  const [nodeLabels, setNodeLabels] = useState([]);
  const [expandedLabel, setExpandedLabel] = useState(null); // Track which label is expanded
  const [nodePrimeEntities, setNodePrimeEntities] = useState({}); // Store entities for each label
  const [nodeEntities, setNodeEntities] = useState({});
  const [relationshipTypes, setRelationshipTypes] = useState([]);
  const [expandedRelationship, setExpandedRelationship] = useState(null);
  const [relationshipPrimeEntities, setRelationshipPrimeEntities] = useState({});
  const [relationshipEntities, setRelationshipEntities] = useState({});
  const [propertyKeys, setPropertyKeys] = useState([]);
  const [isNodeLabelsOpen, setIsNodeLabelsOpen] = useState(false);
  const [isRelationshipTypesOpen, setIsRelationshipTypesOpen] = useState(false);
  const [isPropertyKeysOpen, setIsPropertyKeysOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState({
    nodeEntities: [],
    relationshipEntities: [],
    propertyKeys: [],
  });

  const [graphNodes, setGraphNodes] = useState([
    // { id: 1, nodeLabel: 'PERSON', properties: { name: 'Alice', age: 30, role: 'Engineer' } },
    // { id: 2, nodeLabel: 'PERSON', properties: { name: 'Bob', age: 25, role: 'Designer' } },
    // { id: 3, nodeLabel: 'KNOWLEDGE', properties: { title: 'Graph Database', type: 'Tutorial', category: 'Technology' } },
    // { id: 4, nodeLabel: 'PERSON', properties: { name: 'Charlie', age: 35, role: 'Manager' } },
    // { id: 5, nodeLabel: 'KNOWLEDGE', properties: { title: 'Graph Science', type: 'Tutorial', category: 'Technology' } },
  ]);
  const [graphRelationships, setGraphRelationships] = useState([
    // { startNode: 1, endNode: 2, type: 'FRIEND', properties: { since: '2020', frequency: 'Weekly' } },
    // { startNode: 1, endNode: 3, type: 'LIKES', properties: { since: '2019', frequency: 'Monthly' } },
    // { startNode: 2, endNode: 3, type: 'LIKES', properties: { since: '2018', frequency: 'Daily' } },
    // { startNode: 4, endNode: 5, type: 'LIKES', properties: { since: '2016', frequency: 'Monthly' } },
  ]);
  const [graphNodesBuffer, setGraphNodesBuffer] = useState([]);
  const [graphRelationshipsBuffer, setGraphRelationshipsBuffer] = useState([]);

  //每一次更新 graphNodes 和 graphRelationships 时，都需要检查是否有重复的节点和关系，
  // 如果有重复的节点和关系，需要将重复的节点和关系去重
  //检查完成之后才允许GraphComponent渲染
  const [isDataClean, setIsDataClean] = useState(false);
  const deduplicateNodes = (nodes) => {
    const seen = new Set();
    return nodes.filter(node => {
      if (seen.has(node.id)) {
        return false;
      }
      seen.add(node.id);
      return true;
    });
  };

  const deduplicateRelationships = (relationships) => {
    const seen = new Set();
    return relationships.filter(rel => {
      const key = `${rel.startNode}-${rel.endNode}-${rel.type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  useEffect(() => {
    const uniqueNodes = deduplicateNodes(graphNodes);
    const uniqueRelationships = deduplicateRelationships(graphRelationships);

    let nodesUpdated = false;
    let relationshipsUpdated = false;

    if (uniqueNodes.length !== graphNodes.length) {
      setGraphNodes(uniqueNodes);
      nodesUpdated = true;
    }

    if (uniqueRelationships.length !== graphRelationships.length) {
      setGraphRelationships(uniqueRelationships);
      relationshipsUpdated = true;
    }

    // Set readiness only after ensuring data is clean
    if (!nodesUpdated && !relationshipsUpdated) {
      setIsDataClean(true);
    } else {
      setIsDataClean(false);
    }
  }, [graphNodes, graphRelationships]);

  const cleanUp = () => {
    setNodeLabels([]);
    setExpandedLabel(null);
    setNodePrimeEntities({});
    setRelationshipTypes([]);
    setExpandedRelationship(null);
    setRelationshipPrimeEntities({});
    setPropertyKeys([]);
    setIsNodeLabelsOpen(false);
    setIsRelationshipTypesOpen(false);
    setIsPropertyKeysOpen(false);
    setSearchQuery('');
    setFilteredResults({
      nodeEntities: [],
      relationshipEntities: [],
      propertyKeys: [],
    });
  };

  const [tabs, setTabs] = useState([
    {
      id: 1,
      title: 'Tab 1',
      databaseInfo: { protocol: 'bolt://', connectUrl: '', selectedDatabase: null },
      graphData: {
        graphNodes: [], // Nodes for the graph
        graphRelationships: [], // Relationships for the graph
        graphNodesBuffer: [],
        graphRelationshipsBuffer: [],
      },
      nodeInfo: { nodeLabels: [], expandedLabel: null, nodeEntities: {} },
      relationshipInfo: { relationshipTypes: [], expandedRelationship: null, relationshipEntities: {} },
      propertyInfo: { propertyKeys: [] },
      uiState: {
        isNodeLabelsOpen: false,
        isRelationshipTypesOpen: false,
        isPropertyKeysOpen: false,
        searchQuery: '',
        filteredResults: {
          nodeEntities: [],
          relationshipEntities: [],
          propertyKeys: [],
        },
      },
    },
  ]);

  const [activeTab, setActiveTab] = useState(1);

  useEffect(() => {
    if (!tabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(1);
    }
  }, [tabs]);

  const saveCurrentTabState = () => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTab
          ? {
              ...tab,
              graphData: {
                graphNodes: graphNodes,
                graphRelationships: graphRelationships,
                graphNodesBuffer: graphNodesBuffer,
                graphRelationshipsBuffer: graphRelationshipsBuffer,
              },
              nodeInfo: {
                nodeLabels,
                expandedLabel,
                nodeEntities: nodePrimeEntities,
              },
              relationshipInfo: {
                relationshipTypes,
                expandedRelationship,
                relationshipEntities: relationshipPrimeEntities,
              },
              propertyInfo: {
                propertyKeys,
              },
              uiState: {
                isNodeLabelsOpen,
                isRelationshipTypesOpen,
                isPropertyKeysOpen,
                searchQuery,
                filteredResults,
              },
            }
          : tab
      )
    );
  };

  // 存储当前tab的状态
  // 清楚页面上的所有数据
  // 切换到新的tab
  // 从新的tab中恢复数据
  const handleTabSwitch = (tabId) => {
    saveCurrentTabState();
    cleanUp();

    const newTab = tabs.find((tab) => tab.id === tabId);
    if (newTab) {
      setNodeLabels(newTab.nodeInfo.nodeLabels || []);
      setExpandedLabel(newTab.nodeInfo.expandedLabel || null);
      setNodePrimeEntities(newTab.nodeInfo.nodeEntities || {});

      setRelationshipTypes(newTab.relationshipInfo.relationshipTypes || []);
      setExpandedRelationship(newTab.relationshipInfo.expandedRelationship || null);
      setRelationshipPrimeEntities(newTab.relationshipInfo.relationshipEntities || {});

      setPropertyKeys(newTab.propertyInfo.propertyKeys || []);

      setIsNodeLabelsOpen(newTab.uiState.isNodeLabelsOpen || false);
      setIsRelationshipTypesOpen(newTab.uiState.isRelationshipTypesOpen || false);
      setIsPropertyKeysOpen(newTab.uiState.isPropertyKeysOpen || false);

      setSearchQuery(newTab.uiState.searchQuery || '');
      setFilteredResults(newTab.uiState.filteredResults || {
        nodeEntities: [],
        relationshipEntities: [],
        propertyKeys: [],
      });

      // Restore graph data
      setGraphNodes(newTab.graphData.graphNodes || []);
      setGraphRelationships(newTab.graphData.graphRelationships || []);
      setGraphNodesBuffer(newTab.graphData.graphNodesBuffer || []);
      setGraphRelationshipsBuffer(newTab.graphData.graphRelationshipsBuffer || []);

      setActiveTab(tabId);
    }
  };

  const handleAddTab = () => {
    const newTabId = tabs.length > 0 ? tabs[tabs.length - 1].id + 1 : 1;

    // Save the current tab state
    saveCurrentTabState();

    // Add the new tab
    const newTab = {
      id: newTabId,
      title: `Tab ${newTabId}`,
      databaseInfo: { protocol: 'bolt://', connectUrl: '', selectedDatabase: null },
      nodeInfo: { nodeLabels: [], expandedLabel: null, nodeEntities: {} },
      relationshipInfo: { relationshipTypes: [], expandedRelationship: null, relationshipEntities: {} },
      propertyInfo: { propertyKeys: [] },
      uiState: {
        isNodeLabelsOpen: false,
        isRelationshipTypesOpen: false,
        isPropertyKeysOpen: false,
        searchQuery: '',
        filteredResults: {
          nodeEntities: [],
          relationshipEntities: [],
          propertyKeys: [],
        },
      },
      graphData: {
        graphNodes: [], // Nodes for the graph
        graphRelationships: [], // Relationships for the graph
        graphNodesBuffer: [],
        graphRelationshipsBuffer: [],
      },
    };

    setTabs((prevTabs) => [...prevTabs, newTab]);
    setActiveTab(newTabId);

    // Clear the current state after the new tab is active
    cleanUp();
  };

  const handleCloseTab = (tabId) => {
    if (tabId === activeTab) {
      saveCurrentTabState();
    }

    setTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== tabId));

    if (activeTab === tabId && tabs.length > 1) {
      setActiveTab(tabs[0].id);
    } else if (tabs.length === 1) {
      setActiveTab(null);
    }
  };

  const handleSearch = (query) => {
    if (!query.trim()) {
      // If the query is empty, reset the filtered results to empty
      setFilteredResults({
        nodeEntities: [],
        relationshipEntities: [],
        propertyKeys: [],
      });
      return;
    }

    // Normalize query and prepare data
    const lowerCaseQuery = query.toLowerCase();

    // Filter node entities
    const filteredNodeEntities = Object.entries(nodePrimeEntities).flatMap(([label, entities]) =>
      searchData(
        entities, // Array of strings
        lowerCaseQuery, // Query
        (entity) => entity, // Directly use the string entity for filtering
        (entity, index) => `${label}-${index}` // Generate an ID based on the label and index
      )
    );
    console.log("Filtered nodeEntities:", filteredNodeEntities);

    // Filter relationship entities
    const filteredRelationshipEntities = Object.entries(relationshipPrimeEntities).flatMap(([type, entities]) =>
      searchData(
        entities,
        lowerCaseQuery,
        (entity) => entity.join(' '), // Accessor for combined entity properties
        (entity) => entity.id // Accessor for relationship id
      )
    );

    // Filter property keys
    const filteredPropertyKeys = searchData(
      propertyKeys,
      lowerCaseQuery,
      (key) => key // Accessor for property key
    );

    // Aggregate results
    const results = {
      nodeEntities: filteredNodeEntities,
      relationshipEntities: filteredRelationshipEntities,
      propertyKeys: filteredPropertyKeys,
    };

    // Update state
    setFilteredResults(results);
  };

  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };

  const tabContentRef = useRef(null); // 用于获取 tabContent 的 DOM
  const [tabContentBounds, setTabContentBounds] = useState(null);

  useEffect(() => {
    if (tabContentRef.current) {
      setTabContentBounds(tabContentRef.current.getBoundingClientRect());
    }
    const handleResize = () => {
      if (tabContentRef.current) {
        setTabContentBounds(tabContentRef.current.getBoundingClientRect());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const fetchDatabases = async () => {
      try {
        const response = await fetch('http://localhost:8000/get_user_databases/', {
          method: 'GET',
          credentials: 'include', // Include cookies for authentication
        });

        if (!response.ok) {
          throw new Error('Failed to fetch databases');
        }

        const data = await response.json();
        if (data.success) {
          setDatabases(data.databases);
        } else {
          console.error(data.error);
        }
      } catch (error) {
        console.error('Error fetching databases:', error);
      }
    };

    fetchDatabases();
  }, []);

  const handleDatabaseSelection = async (url) => {
    try {
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch('http://localhost:8000/select_database/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ selectedUrl: url }),
        credentials: 'include',
      });

      const result = await response.json();
      if (result.success) {
        setSelectedDatabase(url);
        // alert('Database selected and connected successfully.');

        // 在数据库选择成功后调用 fetchDatabaseInfo 获取数据库信息
        await fetchDatabaseInfo();
        //将url保存到当前tab的数据库信息中
        tabs.find((tab) => tab.id === activeTab).databaseInfo.selectedDatabase = url;
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error selecting database:', error);
      alert('Error selecting database.');
    }
  };

  const handleAddDatabase = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);
  const handleToggleSettingsMenu = (index) => {
    setOpenSettingsIndex(openSettingsIndex === index ? null : index);
  };

  const handleToggleDatabaseMenu = () => {
    setIsDatabaseMenuOpen(!isDatabaseMenuOpen);
    console.log('Database menu open:', !isDatabaseMenuOpen);
  };

  const handleDeleteDatabase = async (url) => {
    if (databases.length <= 1) {
      alert('You must have at least one database.');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/delete_database/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
        credentials: 'include', // Include cookies for authentication
      });

      const result = await response.json();
      if (result.success) {
        // Update the local state to remove the deleted database
        setDatabases(databases.filter((db) => db.url !== url));
        alert('Database deleted successfully.');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting database:', error);
      alert('Error deleting database.');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const fullUrl = `${protocol}${connectUrl}`;

    try {
      const response = await fetch('http://localhost:8000/add_database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullUrl,
          serverUsername,
          serverPassword,
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert('Database added successfully!');
        setIsModalOpen(false);
        // 处理成功后的其他逻辑，比如刷新数据库列表
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding database:', error);
    }
  };

  // Function to fetch node labels, relationship types, and property keys from the back-end
  const fetchDatabaseInfo = async () => {
    try {
      const response = await fetch('http://localhost:8000/get_database_info/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setNodeLabels(data.labels || []);
        setRelationshipTypes(data.relationship_types || []);
        setPropertyKeys(data.property_keys || []);

        // Wait until nodeLabels and relationshipTypes are set, then fetch entities
        for (const label of data.labels || []) {
          await fetchEntitiesForLabel(label);
        }
        for (const type of data.relationship_types || []) {
          await fetchEntitiesForRelationship(type);
        }
      } else {
        console.error("Error fetching database info:", data.error);
      }
    } catch (error) {
      console.error("Error fetching database info:", error);
    }
  };

  // Fetch entities for a given label when it is expanded
  const fetchEntitiesForLabel = (label) => {
    fetch('http://localhost:8000/get_nodeEntities/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ label }),
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setNodePrimeEntities((prevEntities) => {
            const updatedPrimeEntities = { ...prevEntities, [label]: data.nodeEntities[0] };
            console.log("Entities for each label after update:", updatedPrimeEntities);
            return updatedPrimeEntities;
          });
          setNodeEntities((prevEntities) => {
            const updatedEntities = { ...prevEntities, [label]: data.nodeEntities[1] };
            console.log("Entities for each label after update:", updatedEntities);
            return updatedEntities;
          });
        } else {
          alert('Error fetching entities: ' + data.error);
        }
      })
      .catch((error) => console.error('Error fetching entities:', error));
  };

  // Fetch entities for a given relationship type when it is expanded
  const fetchEntitiesForRelationship = (type) => {
    fetch('http://localhost:8000/get_relationshipEntities/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type }),
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setRelationshipPrimeEntities((prevEntities) => {
            const updatedPrimeEntities = { ...prevEntities, [type]: data.relationshipEntities[0] };
            console.log("Entities for each relationship type after update:", updatedPrimeEntities);
            return updatedPrimeEntities;
          });
          setRelationshipEntities((prevEntities) => {
            const updatedEntities = { ...prevEntities, [type]: data.relationshipEntities[1] };
            console.log("Entities for each relationship type after update:", updatedEntities);
            return updatedEntities;
          });
        } else {
          alert('Error fetching entities: ' + data.error);
        }
      })
      .catch((error) => console.error('Error fetching entities:', error));
  };

  const toggleNodeLabels = () => setIsNodeLabelsOpen(!isNodeLabelsOpen);
  const toggleRelationshipTypes = () => setIsRelationshipTypesOpen(!isRelationshipTypesOpen);
  const togglePropertyKeys = () => setIsPropertyKeysOpen(!isPropertyKeysOpen);
  const toggleExpandedLabel = (label) => {
    setExpandedLabel(expandedLabel === label ? null : label); // Toggle between expanded and collapsed
  };
  const toggleExpandedRelationship = (type) => {
    setExpandedRelationship(expandedRelationship === type ? null : type); // Toggle between expanded and collapsed
  };

  return (
    <div className={styles.flexColumn}>
      <section className={`${styles.playground} ${styles.mainContentSection}`}>
        <div className={styles.contentBoxGroup}>
          <div className={styles.flexRowHeader}>
            <div className={styles.brandingContainer}>
              <Image
                className={styles.brandingImage}
                src="/assets/0fbf1a91f14780ce3fa9a491a86c9449.svg"
                alt="alt text"
                width={100}
                height={50}
              />
              <div className={styles.brandingTextContainer}>
                <p className={styles.brandingNameText}>SMARTD</p>
                <p className={styles.brandingStudioText}>STUDIO</p>
              </div>
            </div>
            <a href="/" className={styles.navItemHome}>Home</a>
            <a href="/playground" className={styles.navItemPlayground}>Playground</a>
            <p className={styles.navItemTutorial}>Tutorial</p>
            <p className={styles.navItemAbout}>About</p>
          </div>
        </div>

        <div className={styles.featureGroup}>
          <div className={styles.flexRowFeatures}>
            <div className={styles.featureContentBox}>
              <div className={styles.featureColumnBox}>
                <div className={styles.flexRowInfoDatabase}>
                  <div className={styles.flexRowDatabaseImages} onClick={handleToggleDatabaseMenu}>
                    <Image
                      className={styles.imageDatabase}
                      src="/assets/b8cc5f09c290b9922de3d8a93473af01.svg"
                      alt="alt text"
                      width={50}
                      height={50}
                    />
                    <p className={styles.featureTextUseDatabase}>Use database</p>
                    <Image
                      className={`${styles.imageDatabaseExtra} ${isDatabaseMenuOpen ? styles.rotate : ''}`}
                      src="/assets/c1122939168fb69f50f3e2f253333e62.svg"
                      alt="extra options"
                      width={20}
                      height={20}
                    />
                  </div>

                  {/* 数据库菜单部分，只有在 isDatabaseMenuOpen 为 true 时才显示 */}
                  {isDatabaseMenuOpen && (
                    <div className={`${styles.databaseMenu} show`} onClick={() => console.log('Menu is rendered')}>
                        <div className={styles.addDatabaseSection}>
                            <button id="addDatabaseBtn" className={styles.addDatabaseBtn}
                            // clickout to close the AddDatabase
                            onClick= {() => {
                                handleAddDatabase();
                                document.addEventListener('click', (e) => {
                                if (!e.target.closest(`.${styles.addDatabaseBtn}`)) {
                                    setIsModalOpen(false);
                                }
                                });
                            }}
                            >+ Add New Database</button>
                        </div>

                        {databases.map((db, index) => {
                          const isActive = tabs.find((tab) => tab.id === activeTab)?.databaseInfo.selectedDatabase === db.url;

                          return (
                            <div
                            key={index}
                            className={`${styles.databaseItem} ${isActive ? styles.selected : ''}`}
                            onClick={() => handleDatabaseSelection(db.url)}
                        >
                            <span className={`${styles.selectedLabel} ${isActive ? '' : styles.hidden}`}>
                            <Image
                                src="/assets/asd953aa98cdd54cef71b5b8167386wa.svg"
                                alt="check icon"
                                width={20}
                                height={20}
                            />
                            </span>
                            <p>{db.url.replace('neo4j://', '').replace('bolt://', '').replace('neo4j+s://', '').replace('bolt+s://', '')}</p>
                            <input type="hidden" className={styles.fullUrl} value={db.url} />
                            <Image
                            className={styles.settingsIcon}
                            src="/assets/e21aaacasc3469ef458c264147aer45c.svg"
                            alt="settings icon"
                            width={20}
                            height={20}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevents the parent `onClick` from being triggered
                                handleToggleSettingsMenu(index);
                                // clickout to close the settings menu
                                document.addEventListener('click', (e) => {
                                if (!e.target.closest(`.${styles.settingsMenu}`)) {
                                    setOpenSettingsIndex(null);
                                }
                                });
                              }}
                            />

                            {/* Settings menu, shown if openSettingsIndex matches the current index */}
                            {openSettingsIndex === index && (
                            <div className={`${styles.settingsMenu}`}>
                                <button
                                className={styles.settingsMenuItem}
                                onClick={() => handleDeleteDatabase(db.url)}
                                >
                                Delete Database
                                </button>
                            </div>
                            )}
                        </div>
                          );
                        })}
                    </div>
                    )}

                    {/* 模态框部分 */}
                    {isModalOpen && (
                    <div className={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles['modal-content']}>
                        <span className={styles.closeBtn} onClick={handleCloseModal}>&times;</span>
                        <form onSubmit={handleFormSubmit}>
                            <div className={styles['input-group']}>
                            <label htmlFor="addDatabaseProtocol">Connect URL</label>
                            <div className={styles['input-flex']}>
                                <select
                                value={protocol}
                                onChange={(e) => setProtocol(e.target.value)}
                                >
                                <option value="neo4j://">neo4j://</option>
                                <option value="bolt://">bolt://</option>
                                <option value="neo4j+s://">neo4j+s://</option>
                                <option value="bolt+s://">bolt+s://</option>
                                </select>
                                <input
                                type="text"
                                value={connectUrl}
                                onChange={(e) => setConnectUrl(e.target.value)}
                                placeholder="192.168.0.54:7687"
                                required
                                />
                            </div>
                            </div>
                            <div className={styles['input-group']}>
                            <label htmlFor="serverUsername">Server Username</label>
                            <input
                                type="text"
                                value={serverUsername}
                                onChange={(e) => setServerUsername(e.target.value)}
                                placeholder="Enter server username"
                                required
                            />
                            </div>
                            <div className={styles['input-group']}>
                            <label htmlFor="serverPassword">Server Password</label>
                            <input
                                type="password"
                                value={serverPassword}
                                onChange={(e) => setServerPassword(e.target.value)}
                                placeholder="Enter server password"
                                required
                            />
                            </div>
                            <button type="submit" className={styles['submit-btn']}>
                            Connect Database
                            </button>
                        </form>
                        </div>
                        </div>
                    </div>
                    )}
                </div>

                <div className={styles.searchFeatureContentBox}>
                  <div className={styles.flexRowSearchFeature}>
                    <Image
                      className={styles.imageSearchFeature}
                      src="/assets/5ef24176ffb1a63d056fe2471d9a3805.svg"
                      alt="search icon"
                      width={30}
                      height={30}
                    />
                    <input
                      type="text"
                      placeholder="Search for..."
                      value={searchQuery}
                      onChange={handleSearchInput}
                      className={styles.searchInput}
                    />
                  </div>

                  {/* Display categorized search results */}
                  {searchQuery.trim() && (
                    <div className={styles.searchResults}>
                      {Object.entries(filteredResults).map(([category, results]) => (
                        results.length > 0 && (
                          <div key={category} className={styles.searchCategory}>
                            <h4 className={styles.categoryTitle}>{category}</h4>
                            <ul className={styles.resultList}>
                              {results.map((result, idx) => (
                                <li key={idx} className={styles.searchResultItem}>
                                  <span className={styles.resultName}>{result.value || result}</span> {/* Render value */}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.flexRowGraphInfo}>
                  <GraphInfoDisplay graphNodes={graphNodes} graphRelationships={graphRelationships} />
                </div>

                <div className={styles.nodeLabelsContentBox}>
                  <div className={styles.flexRowNodeLabels}  onClick={toggleNodeLabels}>
                    <Image
                      className={styles.imageNodeLabels}
                      src="/assets/f39953aa98cdd54cef71b5b81673864d.svg"
                      alt="node labels"
                      width={30}
                      height={30}
                    />
                    <p className={styles.featureTextNodeLabels}>Node labels</p>
                    <Image
                      className={`${styles.imageNodeLabelsExtra} ${isNodeLabelsOpen ? styles.rotate : ''}`}
                      src="/assets/c1122939168fb69f50f3e2f253333e62.svg"
                      alt="expand"
                      width={20}
                      height={20}
                    />
                  </div>
                  {isNodeLabelsOpen && (
                  <div id="nodeLabelsList" className={styles.nodeLabelsList}>
                    {nodeLabels.map((label, index) => (
                      <div key={index} className={styles.labelItemContainer}>
                        <div className={styles.labelItem} onClick={() => toggleExpandedLabel(label)}>
                          {label}
                          <Image
                            className={`${styles.imageNodeLabelsExtra} ${expandedLabel === label ? styles.rotate : ''}`}
                            src="/assets/c1122939168fb69f50f3e2f253333e62.svg"
                            alt="expand"
                            width={20}
                            height={20}
                          />
                        </div>
                        {expandedLabel === label && nodePrimeEntities[label] && (
                        <div className={styles.entityList}>
                          {nodePrimeEntities[label].map((entity, idx) => (
                            <div key={idx} className={styles.entityItemContainer}>
                              <p className={styles.entityItem}>{entity}</p>
                              <Image
                                src="/assets/add.svg"
                                alt="add"
                                width={20}
                                height={20}
                                className={styles.addButton}
                                onClick={() => handleAddEntity(entity)}
                              />
                            </div>
                          ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  )}
                </div>

                <div className={styles.relationshipTypesContentBox}>
                  <div className={styles.flexRowRelationshipTypes} onClick={toggleRelationshipTypes}>
                    <Image
                      className={styles.imageRelationshipTypes}
                      src="/assets/af00d02696e9f28253626de3f4913e06.svg"
                      alt="relationship types"
                      width={30}
                      height={30}
                    />
                    <p className={styles.featureTextRelationshipTypes}>Relationship types</p>
                    <Image
                      className={`${styles.imageRelationshipTypesExtra} ${isRelationshipTypesOpen ? styles.rotate : ''}`}
                      src="/assets/c1122939168fb69f50f3e2f253333e62.svg"
                      alt="expand"
                      width={20}
                      height={20}
                    />
                  </div>
                  {isRelationshipTypesOpen && (
                    <div id="relationshipTypesList" className={styles.relationshipTypesList}>
                      {relationshipTypes.map((type, index) => (
                        <div key={index} className={styles.typeItemContainer}>
                          <p className={styles.typeItem} onClick={() => toggleExpandedRelationship(type)}>
                            {type}
                            <Image
                              className={`${styles.imageRelationshipTypesExtra} ${expandedRelationship === type ? styles.rotate : ''}`}
                              src="/assets/c1122939168fb69f50f3e2f253333e62.svg"
                              alt="expand"
                              width={20}
                              height={20}
                            />
                          </p>
                          {expandedRelationship === type && relationshipPrimeEntities[type] && (
                            <div className={styles.entityList}>
                              {relationshipPrimeEntities[type].map((entity, idx) => (
                                <div key={idx} className={styles.entityGroup}>
                                  <div className={styles.entityItemContainer}>
                                    <div className={styles.relationshipEntityItemContainer}>
                                      {/* First line: Display the first element of the entity */}
                                      <p className={styles.entityItem}>{entity[0]}</p>

                                      {/* Second line: Centered arrow icon */}
                                      <div className={styles.arrowContainer}>
                                        <Image
                                          src="/assets/cc-arrow-down.svg"
                                          alt="arrow down"
                                          width={20}
                                          height={20}
                                          className={styles.arrowIcon}
                                        />
                                      </div>

                                      {/* Third line: Display the second element of the entity */}
                                      <p className={styles.entityItem}>{entity[1]}</p>
                                    </div>
                                    <Image
                                      src="/assets/add.svg"
                                      alt="add"
                                      width={20}
                                      height={20}
                                      className={styles.addButton}
                                      onClick={() => handleAddEntity(entity)}
                                    />
                                  </div>
                                  {/* Separator line */}
                                  <div className={styles.separator}></div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.propertyKeysContentBox}>
                  <div className={styles.flexRowPropertyKeys} onClick={togglePropertyKeys}>
                    <Image
                      className={styles.imagePropertyKeys}
                      src="/assets/d819e70012ea9e1d2487b007aec7b35b.svg"
                      alt="property keys"
                      width={30}
                      height={30}
                    />
                    <p className={styles.featureTextPropertyKeys}>Property keys</p>
                    <Image
                      className={`${styles.imagePropertyKeysExtra} ${isPropertyKeysOpen ? styles.rotate : ''}`}
                      src="/assets/c1122939168fb69f50f3e2f253333e62.svg"
                      alt="expand"
                      width={20}
                      height={20}
                    />
                  </div>
                  {isPropertyKeysOpen && (
                    <div id="propertyKeysList" className={styles.propertyKeysList}>
                        {/* 动态加载 property keys */}
                        {propertyKeys.map((key, index) => (
                            <p key={index} className={styles.keyItem}>{key}</p>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.tabContainer}>
              {/* 标签导航 */}
              <div className={styles.tabNav}>
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
                    onClick={() => handleTabSwitch(tab.id)}
                  >
                    {tab.title}
                    <span className={styles.closeButton} onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}>
                      ×
                    </span>
                  </div>
                ))}
                <button className={styles.addTabButton} onClick={handleAddTab}>
                  + Add Tab
                </button>
              </div>

              {/* 标签内容 */}
              <div className={styles.tabContent} ref={tabContentRef}>
                {tabContentBounds && (
                <Filter
                  // 把graphNodes和graphNodeBuffer合并为graphNodes，组合成一个新的数组
                  graphRelationships = {graphRelationships}
                  graphNodes = {graphNodes}
                  setGraphNodes={setGraphNodes} // Pass state setter for graphNodes
                  setGraphRelationships={setGraphRelationships} // Pass state setter for graphRelationships
                  // buffer
                  graphNodesBuffer = {graphNodesBuffer}
                  graphRelationshipsBuffer = {graphRelationshipsBuffer}
                  setGraphNodesBuffer={setGraphNodesBuffer}
                  setGraphRelationshipsBuffer={setGraphRelationshipsBuffer}
                  tabContentBounds={tabContentBounds}
                />
                )}
                <div className={styles.tabGraph}>
                  {isDataClean && (
                    <DrawGraph
                      nodes={graphNodes}
                      relationships={graphRelationships}
                    />
                  )}
                </div>
                <div className={styles.flexRowGalleryImages}>
                  <div className={styles.iconContainer}>
                    <AddTab nodeEntities
                      AddTabNodeEntities = {nodeEntities}
                      AddTabRelationshipEntities = {relationshipEntities}
                    />
                  </div>
                  <div className={styles.iconContainer}>
                    <TbTrash size={50} className={styles.icon} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
