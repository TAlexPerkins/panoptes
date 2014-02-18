import config
import os

def response(returndata):

    def CheckFolderExistence(dir, name, needWriteAccess):
        if not os.path.isdir(dir):
            raise Exception('Directory {0} does not exist ({1})'.format(name, dir))


    try:
        CheckFolderExistence(config.BASEDIR, 'BASEDIR', False)
        CheckFolderExistence(os.path.join(config.BASEDIR, 'temp'), 'BASEDIR/temp', True)
        CheckFolderExistence(os.path.join(config.BASEDIR, 'Uploads'), 'BASEDIR/Uploads', True)
        CheckFolderExistence(os.path.join(config.BASEDIR, 'SummaryTracks'), 'BASEDIR/SummaryTracks', True)
    except Exception as e:
        returndata['issue'] = str(e)

    return returndata