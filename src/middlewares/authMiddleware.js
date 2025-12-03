const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next(); 
    }
    res.redirect('/auth/login');
};

const hasRole = (roles) => {
    return (req, res, next) => {
        if(!req.session.user){
            res.redirect('/auth/login');
        }
    
    const userRole = req.session.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if(allowedRoles.includes(userRole)){
        return next();
    }

    res.redirect('/computer');
    };

};

module.exports = {
    isAuthenticated, 
    hasRole
};
