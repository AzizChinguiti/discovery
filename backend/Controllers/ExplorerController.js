const bcrypt = require("bcrypt");
const db = require("../database/index");

module.exports = {
  getExplorerById: async function (req, res) {
    try {
      const explorer = await db.Explorer.findByPk(req.params.idexplorer);
      if (!explorer) {
        return res.status(404).send("Explorer not found");
      }
      return res.status(200).json(explorer);
    } catch (error) {
      console.error("Error fetching explorer:", error);
      return res.status(500).send("Failed to fetch explorer");
    }
  },

  editExplorer: async function (req, res) {
    try {
      const explorer = await db.Explorer.findByPk(req.params.idexplorer);
      if (!explorer) {
        return res.status(404).send("Explorer not found");
      }
  
      if (!req.body.currentPassword) {
        return res.status(400).send("Current password is required");
      }
  
      const isPasswordValid = await bcrypt.compare(
        req.body.currentPassword,
        explorer.password
      );
      if (!isPasswordValid) {
        return res.status(401).send("Invalid password");
      }
  
      const updateFields = {
        firstname: req.body.firstname || explorer.firstname,
        lastname: req.body.lastname || explorer.lastname,
        description: req.body.description || explorer.description,
        image: req.body.image || explorer.image,
        mobileNum: req.body.mobileNum || explorer.mobileNum,
        governorate: req.body.governorate || explorer.governorate,
        municipality: req.body.municipality || explorer.municipality,
        selectedItemName: req.body.selectedItemName || explorer.selectedItemName,
        selectedItemImage: req.body.selectedItemImage || explorer.selectedItemImage,
      };
  
      if (req.body.newPassword) {
        const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
        updateFields.password = hashedPassword;
      }
  
      const result = await db.Explorer.update(updateFields, {
        where: { idexplorer: req.params.idexplorer },
      });
  
      if (result[0] === 1) {
        const updatedExplorer = await db.Explorer.findOne({
          where: { idexplorer: req.params.idexplorer },
        });
        
        return res.status(200).send(updatedExplorer.toJSON());
      } else {
        return res.status(500).send("Failed to update explorer");
      }
    } catch (error) {
      console.error("Error updating explorer:", error);
      return res.status(500).send("Failed to update explorer");
    }
  },

  getExplorerPosts: async function (req, res) {
    const { idexplorer } = req.params;

    try {
      const explorer = await db.Explorer.findByPk(idexplorer);
      if (!explorer) {
        return res.status(404).json({ error: "Explorer not found" });
      }

      const posts = await db.Posts.findAll({
        where: { explorer_idexplorer: idexplorer },
        order: [["createdAt", "DESC"]],
      });

      return res.status(200).json(posts);
    } catch (error) {
      console.error("Error fetching explorer posts:", error);
      return res.status(500).json({ error: "Failed to fetch explorer posts" });
    }
  },

  getExplorerNumberPosts: async function (req, res) {
    const { idexplorer } = req.params;
  
    try {
      const explorer = await db.Explorer.findByPk(idexplorer);
      if (!explorer) {
        return res.status(404).json({ error: "Explorer not found" });
      }
  
      const posts = await db.Posts.findAll({
        where: { explorer_idexplorer: idexplorer },
        order: [["createdAt", "DESC"]],
      });
      const numOfPosts = posts.length;
      await explorer.update({ numOfPosts: numOfPosts });
      
      return res.status(200).json(numOfPosts);
    } catch (error) {
      console.error("Error fetching number explorer posts:", error);
      return res.status(500).json({ error: "Failed to fetch explorer posts" });
    }
  },

  removeFromFavourites: async function (req, res) {
    const { idexplorer, idposts } = req.params;

    try {
      const favorite = await db.Favorites.findOne({
        where: {
          explorer_idexplorer: idexplorer,
          posts_idposts: idposts,
        },
      });

      if (!favorite) {
        return res.status(404).json({ error: "Favorite record not found" });
      }

      await favorite.destroy();

      return res.status(200).json({ message: "Post removed from favourites" });
    } catch (error) {
      console.error("Error removing post from favourites:", error);
      return res
        .status(500)
        .json({ error: "Failed to remove post from favourites" });
    }
  },

  addOrRemoveFromFavorites: async function (req, res) {
    const { idexplorer, idposts } = req.params;
  
    try {
      const favorite = await db.Favorites.findOne({
        where: {
          explorer_idexplorer: idexplorer,
          posts_idposts: idposts,
        },
      });
  
      const post = await db.Posts.findByPk(idposts);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
  
      const explorer = await db.Explorer.findByPk(idexplorer);
      if (!explorer) {
        return res.status(404).json({ error: "Explorer not found" });
      }
  
      const postOwner = post.explorer_idexplorer ? 
        await db.Explorer.findByPk(post.explorer_idexplorer) : 
        await db.Business.findByPk(post.business_idbusiness);
  
      if (!postOwner) {
        return res.status(404).json({ error: "Post owner not found" });
      }
  
      if (favorite) {
        await favorite.destroy();
        explorer.numOfLikes = Math.max(explorer.numOfLikes - 1, 0);
        await explorer.save();
        
        postOwner.coins = Math.max(postOwner.coins - 5, 0);
        await postOwner.save();
  
        return res.status(200).json({ message: "Post removed from favorites" });
      } else {
        await db.Favorites.create({
          explorer_idexplorer: idexplorer,
          posts_idposts: idposts,
          post_title: post.title,
          post_image1: post.image1,
          post_location: post.location,
        });
  
        explorer.numOfLikes += 1;
        await explorer.save();
  
        postOwner.coins += 5;
        await postOwner.save();
  
        await db.Notif.create({
          type: 'favorite',
          message: `${explorer.firstname} ${explorer.lastname} added your post to favorites`,
          explorer_idexplorer: postOwner.idexplorer || null,
          business_idbusiness: postOwner.idbusiness || null,
          created_at: new Date(),
          is_read: false,
          senderImage: explorer.image
        });
  
        return res.status(200).json({ message: "Post added to favorites" });
      }
    } catch (error) {
      console.error("Error adding/removing post to/from favorites:", error);
      return res.status(500).json({ error: "Failed to add/remove post to/from favorites" });
    }
  },
  
  isPostFavoritedByExplorer: async function (req, res) {
    const { idexplorer, idposts } = req.params;

    try {
      const favorite = await db.Favorites.findOne({
        where: { explorer_idexplorer: idexplorer, posts_idposts: idposts },
      });

      if (favorite) {
        return res.status(200).json({ favorited: true });
      } else {
        return res.status(200).json({ favorited: false });
      }
    } catch (error) {
      return res.status(500).json({ error: "Error checking favorite" });
    }
  },

  getExplorerFavorites: async function (req, res) {
    const { idexplorer } = req.params;
  
    try {
      const favoritePosts = await db.Favorites.findAll({
        where: { explorer_idexplorer: idexplorer },
        include: [
          {
            model: db.Posts,
            attributes: ['idposts', 'title', 'image1', 'location'],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      return res.status(200).json(favoritePosts);
    } catch (error) {
      console.error("Error fetching explorer favorites:", error);
      return res.status(500).json({ error: "Failed to fetch explorer favorites" });
    }
  },

  addOrRemoveFromTraveled: async function (req, res) {
    const { idexplorer, idposts } = req.params;
  
    try {
      const traveled = await db.Traveled.findOne({
        where: {
          explorer_idexplorer: idexplorer,
          posts_idposts: idposts,
        },
      });
  
      if (traveled) {
        await traveled.destroy();
  
        const explorer = await db.Explorer.findByPk(idexplorer);
        if (explorer) {
          explorer.numOfVisits = Math.max(explorer.numOfVisits - 1, 0); 
          await explorer.save();
        }
  
        return res.status(200).json({ message: "Post removed from traveled" });
      } else {
        const post = await db.Posts.findByPk(idposts);
        if (!post) {
          return res.status(404).json({ error: "Post not found" });
        }
  
        await db.Traveled.create({
          explorer_idexplorer: idexplorer,
          posts_idposts: idposts,
          post_title: post.title,
          post_image1: post.image1,
          post_location: post.location,
        });
  
        const explorer = await db.Explorer.findByPk(idexplorer);
        if (explorer) {
          explorer.numOfVisits += 1;
          await explorer.save();
        }
  
        return res.status(200).json({ message: "Post added to traveled" });
      }
    } catch (error) {
      console.error("Error adding/removing post to/from traveled:", error);
      return res.status(500).json({ error: "Failed to add/remove post to/from traveled" });
    }
  },
  
  removeFromTraveled: async function (req, res) {
    const { idexplorer, idposts } = req.params;

    try {
      const traveled = await db.Traveled.findOne({
        where: {
          explorer_idexplorer: idexplorer,
          posts_idposts: idposts,
        },
      });

      if (!traveled) {
        return res.status(404).json({ error: "Traveled record not found" });
      }

      await traveled.destroy();

      return res.status(200).json({ message: "Post removed from traveled" });
    } catch (error) {
      console.error("Error removing post from traveled:", error);
      return res
        .status(500)
        .json({ error: "Failed to remove post from traveled" });
    }
  },

  isPostTraveledByExplorer: async function (req, res) {
    const { idexplorer, idposts } = req.params;

    try {
      const traveled = await db.Traveled.findOne({
        where: { explorer_idexplorer: idexplorer, posts_idposts: idposts },
      });

      if (traveled) {
        return res.status(200).json({ traveled: true });
      } else {
        return res.status(200).json({ traveled: false });
      }
    } catch (error) {
      return res.status(500).json({ error: "Error checking traveled" });
    }
  },
  
  updateCategories: async function (req, res) {
    const { idexplorer } = req.params;
    const { categories } = req.body;
  
    try {
      const explorer = await db.Explorer.findByPk(idexplorer);
      if (!explorer) {
        return res.status(404).json({ error: "Explorer not found" });
      }
  
      await explorer.update({ categories });
      return res.status(200).json({ message: "Categories updated successfully" });
    } catch (error) {
      console.error("Error updating categories:", error);
      return res.status(500).json({ error: "Failed to update categories" });
    }
  },

  getTopExplorersByPostCount: async function (req, res) {
    try {
      console.log("Attempting to fetch top explorers by post count");
      
      const topExplorers = await db.Explorer.findAll({
        attributes: ['idexplorer', 'firstname', 'image', 'numOfPosts'],
        order: [['numOfPosts', 'DESC']],
        limit: 3
      });
  
      console.log("Query executed successfully");
      console.log("Top explorers:", JSON.stringify(topExplorers, null, 2));
  
      if (topExplorers.length === 0) {
        console.log("No explorers found");
        return res.status(404).json({ error: "No explorers found" });
      }
  
      const formattedTopExplorers = topExplorers.map(explorer => ({
        idexplorer: explorer.idexplorer,
        firstname: explorer.firstname,
        image: explorer.image,
        postCount: explorer.numOfPosts
      }));
  
      return res.status(200).json(formattedTopExplorers);
    } catch (error) {
      console.error("Error fetching top explorers by posts:", error);
      console.error("Error stack:", error.stack);
      return res.status(500).json({ error: "Failed to fetch top explorers", details: error.message });
    }
  },

  getExplorerTraveled: async function (req, res) {
    const { idexplorer } = req.params;
  
    try {
      const TraveledPosts = await db.Traveled.findAll({
        where: { explorer_idexplorer: idexplorer },
        include: [
          {
            model: db.Posts,
            attributes: ['idposts', 'title', 'image1', 'location'],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      return res.status(200).json(TraveledPosts);
    } catch (error) {
      console.error("Error fetching explorer traveled:", error);
      return res.status(500).json({ error: "Failed to fetch explorer traveled" });
    }
  },

  purchaseMarketItem: async function (req, res) {
    const { idexplorer, iditem } = req.params;
  
    try {
      const transaction = await db.sequelize.transaction();
  
      try {
        const marketItem = await db.Market.findByPk(iditem, { transaction });
        if (!marketItem) {
          await transaction.rollback();
          return res.status(404).json({ error: "Market item not found" });
        }
  
        const explorer = await db.Explorer.findByPk(idexplorer, { transaction });
        if (!explorer) {
          await transaction.rollback();
          return res.status(404).json({ error: "Explorer not found" });
        }
  
        if (explorer.coins < marketItem.itemPrice) {
          await transaction.rollback();
          return res.status(400).json({ error: "Insufficient coins" });
        }
  
        explorer.coins -= marketItem.itemPrice;
  
        explorer.boughtItemName = explorer.boughtItemName
          ? `${explorer.boughtItemName},${marketItem.itemName}`
          : marketItem.itemName;
  
        explorer.boughtItemImage = explorer.boughtItemImage
          ? `${explorer.boughtItemImage},${marketItem.itemImage}`
          : marketItem.itemImage;
  
        if (marketItem.type === "badge") {
          explorer.badge = marketItem.itemName;
        } else {
          explorer.numOfPosts += 1;
        }
  
        await explorer.save({ transaction });
  
        await transaction.commit();
  
        return res.status(200).json({ 
          message: marketItem.type === "badge" 
            ? "Badge purchased successfully" 
            : "Item purchased successfully" 
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error("Error purchasing market item:", error);
      return res.status(500).json({ error: "Failed to purchase market item" });
    }
  },

  getBoughtItems: async function (req, res) {
    const { idexplorer } = req.params;
  
    try {
      const explorer = await db.Explorer.findByPk(idexplorer);
      if (!explorer) {
        return res.status(404).json({ error: "Explorer not found" });
      }
  
      const boughtItemNames = explorer.boughtItemName ? explorer.boughtItemName.split(',') : [];
  
      const boughtItems = await db.Market.findAll({
        where: {
          itemName: {
            [db.Sequelize.Op.in]: boughtItemNames
          }
        },
        attributes: ['iditem', 'itemName', 'itemImage', 'itemPrice', 'type']
      });
  
      if (boughtItems.length === 0) {
        return res.status(200).json([]);
      }
  
      const formattedItems = boughtItems.map(item => ({
        iditem: item.iditem,
        itemName: item.itemName,
        itemImage: item.itemImage,
        itemPrice: item.itemPrice,
        type: item.type
      }));
  
      return res.status(200).json(formattedItems);
    } catch (error) {
      console.error("Error fetching bought items:", error);
      return res.status(500).json({ error: "Failed to fetch bought items" });
    }
  },
getTopExplorersByPosts: async function (req, res) {
  try {
    console.log("Attempting to fetch top explorers");
    const topExplorers = await db.Explorer.findAll({
      attributes: [
        'idexplorer', 
        'firstname', 
        'image',
        [db.sequelize.fn('COUNT', db.sequelize.col('Posts.idposts')), 'postCount']
      ],
      include: [{
        model: db.Posts,
        attributes: [],
      }],
      group: ['Explorer.idexplorer', 'Explorer.firstname', 'Explorer.image'],
      order: [[db.sequelize.literal('postCount'), 'DESC']],
      limit: 3
    });

    console.log("Query executed successfully");
    console.log("Top explorers:", JSON.stringify(topExplorers, null, 2));

    if (topExplorers.length === 0) {
      console.log("No explorers found");
      return res.status(404).json({ error: "No explorers found" });
    }

    const formattedTopExplorers = topExplorers.map(explorer => ({
      idexplorer: explorer.idexplorer,
      firstname: explorer.firstname,
      image: explorer.image,
      postCount: parseInt(explorer.get('postCount'))
    }));

    return res.status(200).json(formattedTopExplorers);
  } catch (error) {
    console.error("Error fetching top explorers by posts:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ error: "Failed to fetch top explorers", details: error.message });
  }
}}