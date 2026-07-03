
>   const performLookup = async (idValue) => {
      if (!idValue.trim()) {
        setLookupError("Please enter a Tag ID or paste a QR link.");
        setLookupResult(null);
        return;
      }
  
      setLookupLoading(true);
      setLookupError("");
      setLookupResult(null);
      setShowAddTagOption(null);
  
      // Extract 8-character ID if full URL is pasted
      let tagId = idValue.trim();
      if (tagId.includes('?=')) {
        tagId = tagId.split('?=')[1];
      } else if (tagId.includes('/')) {
        const parts = tagId.split('/');
        tagId = parts[parts.length - 1];
      }
      // Clean up any query params if present
      tagId = tagId.split('&')[0];
  
      try {
        // 1. Fetch Link Doc
        const linkRef = doc(firestoreDb, 'links', tagId);
        const linkSnap = await getDoc(linkRef);
  
        if (!linkSnap.exists()) {
          setLookupError(`Tag ID "${tagId}" not found in links database.`);
          setShowAddTagOption(tagId);
          setLookupLoading(false);
          return;
        }
  
        const linkData = linkSnap.data();
        let orderData = null;
  
        // 2. Fetch Customer Order Doc if associated
        if (linkData.firestoreOrderId) {
          const orderRef = doc(firestoreDb, 'orders', linkData.firestoreOrderId);
          const orderSnap = await getDoc(orderRef);
          if (orderSnap.exists()) {
            orderData = orderSnap.data();
          }
        }
  
        // Calculate total quantity
        let totalQuantity = 0;
        if (orderData) {
          totalQuantity = (orderData.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
        } else {
          // Fallback to 1 if no order data but manual qr exists
          totalQuantity = 1;
        }
  
        let formattedAddress = 'N/A';
        if (orderData?.shippingAddress) {
          const addrObj = orderData.shippingAddress;
          formattedAddress = `${addrObj.address || ''}, ${addrObj.city || ''}, ${addrObj.state || ''} - 
${addrObj.pincode || ''}`;
        }
  
        const lookupObj = {
          totalQuantity,
          customerName: orderData?.customerName || 'N/A',
          orderedPhoneNumber: orderData?.orderedPhoneNumber || linkData.orderedPhoneNumber || 'N/A',
          orderedEmail: orderData?.orderedEmail || linkData.orderedEmail || 'N/A',
          tagId: tagId,
          firestoreOrderId: linkData.firestoreOrderId || 'N/A',
          shippingAddress: formattedAddress
        };
  
        setLookupResult(lookupObj);
  
        if (packingSessionActiveRef.current) {
          const groupingKey = lookupObj.orderedPhoneNumber !== 'N/A' ? lookupObj.orderedPhoneNumber : 
(lookupObj.firestoreOrderId !== 'N/A' ? lookupObj.firestoreOrderId : tagId);
          
          const prevMap = packingPhoneToBoxMapRef.current;
          let boxNum = prevMap[groupingKey];
          let isNew = false;
          
          if (!boxNum) {
            const values = Object.values(prevMap);
            const currentMax = values.length > 0 ? Math.max(...values) : 0;
            boxNum = currentMax + 1;
            isNew = true;
          }
          
          const resultDetail = {
            boxNumber: boxNum,
            tagId: tagId,
            customerName: lookupObj.customerName,
            isNew: isNew,
            timestamp: new Date().toLocaleTimeString()
          };
          
          setPackingPhoneToBoxMap(prev => ({
            ...prev,
            [groupingKey]: boxNum
          }));
          
          setPackingBoxesData(prevBoxes => {
            const existing = prevBoxes[boxNum] || {
              customerName: lookupObj.customerName,
              orderedPhoneNumber: lookupObj.orderedPhoneNumber,
              orderedEmail: lookupObj.orderedEmail,
              address: lookupObj.shippingAddress,
              tags: []
            };
            
            const updatedTags = existing.tags.includes(tagId) 
              ? existing.tags 
              : [...existing.tags, tagId];
              
            return {
              ...prevBoxes,
              [boxNum]: {
                ...existing,
                tags: updatedTags
              }
            };
          });
  
          setLastAssignedBox(resultDetail);
          setPackingHistory(prev => [resultDetail, ...prev]);
          if (isNew) {
            setMaxBoxNumber(boxNum);
          }
        }
      } catch (err) {
        console.error("Lookup error:", err);
        setLookupError(`Error looking up tag: ${err.message}`);
      } finally {
        setLookupLoading(false);
      }
    };
  
    const handleAddMissingTag = async (tagId) => {
      if (!firestoreDb) {
        setLookupError("Database not connected.");
        return;
      }
      setLookupLoading(true);
      setLookupError("");
      try {
        const docRef = doc(firestoreDb, 'links', tagId);
        await setDoc(docRef, {
          id: tagId,
          domain: predefinedDomain,
          qrCodeUrl: `${predefinedDomain}/id?=${tagId}`,
          status: 'active',


