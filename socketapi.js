const io = require("socket.io")();
const socketapi = {
    io: io
};
const userModel = require("./routes/users")
const msgModel = require("./routes/massage")
const groupModel = require("./routes/group")


// Add your socket.io logic here!
io.on("connection", function (socket) {
    console.log("A user connected");

    socket.on("newUserJoied", async username => {
        const currentUser = await userModel.findOne({
            username: username
        })

        const onlinUsers = await userModel.find({
            socketId: { $nin: [""] },
            username: { $nin: [username] }
        })

        const allgroup = await groupModel.find({users:{$in:[currentUser._id]}}).populate("users")

        allgroup.forEach(singlegp=>{
            socket.emit("show-group",  singlegp);
        })

        onlinUsers.forEach(onlineuser => {
            socket.emit("newUserJoined", {
                img: onlineuser.img,
                username: onlineuser.username,
                lastMessage: "han baay",
                id: onlineuser._id
            })
        })

        socket.broadcast.emit('newUserJoined', {
            img: currentUser.img,
            username: currentUser.username,
            lastMessage: "hannnnnn baay",
            id: currentUser._id
        })

        // console.log
        currentUser.socketId = socket.id
        await currentUser.save()
    })

    socket.on("privateMsg", async msgInfo => {

        await msgModel.create({
            msg: msgInfo.msg,
            sender: msgInfo.sender,
            reciver: msgInfo.reciver
        })
        var recivers = await userModel.findOne({username: msgInfo.reciver})

        if(!recivers){

            const group = await groupModel.findOne({name:msgInfo.reciver}).populate("users")
            // console.log(group);

            group.users.forEach(singleuser=>{
                // console.log(singleuser.socketId);
                socket.to(singleuser.socketId).emit('group-message', msgInfo.msg)
            })

            if(!group){
                return
            }
        }

        if(recivers){
            // console.log("mil raha hia");
            socket.to(recivers.socketId).emit('receive-private-message', msgInfo.msg)
        }
        
    })

    socket.on("getprivatemsg", async msgBtweenUser => {

        const user = await userModel.findOne({username:msgBtweenUser.reciver})
        if(user){
            const allMessage = await msgModel.find({
                $or: [{
                    sender: msgBtweenUser.sender,
                    reciver: msgBtweenUser.reciver
                },
                {
                    sender: msgBtweenUser.reciver,
                    reciver: msgBtweenUser.sender
                }]
            })
            socket.emit("allchats", allMessage)
        }else{
            const allmessage = await msgModel.find({reciver:msgBtweenUser.reciver})
            socket.emit("onlychat", allmessage)
        }
        
    })


    socket.on("create-Group", async groupinfo=>{
        // console.log(groupinfo);

        const newGroup = await groupModel.create({
            name:groupinfo.gpname
        })
        const sender = await userModel.findOne({username:groupinfo.sender})
        newGroup.users.push(sender._id)

        await newGroup.save()
        socket.emit("show-group", newGroup)
    })

    socket.on("join-group", async gpdetails=>{
        const group = await groupModel.findOne({name:gpdetails.gpname})
        // console.log(group);

        const usertojoin = await userModel.findOne({username:gpdetails.sender})
        // console.log(usertojoin);

        group.users.push(usertojoin._id)

        
        await group.save()
        socket.emit("show-group", {
            profile:group.profile,
            name:group.name
        })
        

    })



    socket.on('disconnect', async () => {
        await userModel.findOneAndUpdate({
            socketId: socket.id
        }, {
            socketId: ''
        })
    })

});
// end of socket.io logic

module.exports = socketapi;