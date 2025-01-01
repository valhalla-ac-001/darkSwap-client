import { BatchJoinSplitService, SplitService} from '@thesingularitynetwork/singularity-sdk';
import { DarkpoolContext } from './context/darkpool.context';
import { DatabaseService } from './db/database.service';
import { Note } from '@thesingularitynetwork/darkpool-v1-proof';

export class NoteBatchJoinSplitService {
    
    static async notesJoinSplit(notes: Note[], darkPoolContext: DarkpoolContext, amount: bigint):Promise<Note> | null {
        const dbservice = DatabaseService.getInstance();

        if (notes[0].amount >= amount) {

          for (const note of notes) {
            if (note.amount === amount) {
              return note;
            } else if (note.amount < amount) {
              break;
            }
          }

          const splitservice = new SplitService(darkPoolContext.darkPool);
          const {context : splitContext, outNotes} = await splitservice.prepare(notes[0], amount, darkPoolContext.signature);
          const ids : number[] = []; 
          for(let j = 0; j < outNotes.length; j++) {
            ids[j] = await dbservice.addNote(
              darkPoolContext.chainId, 
              darkPoolContext.publicKey, 
              darkPoolContext.walletAddress, 
              0, 
              outNotes[j].note,
              outNotes[j].rho, 
              outNotes[j].asset,
              outNotes[j].amount,
              3,
              '');
          }        
          await splitservice.generateProof(splitContext);
          const tx = await splitservice.execute(splitContext);
  
          for (let j = 0; j < outNotes.length; j++) {
            await dbservice.updateNoteTransactionAndStatus(ids[j], tx);
          }
          return outNotes[0];
        } else {

          const batchJoinSplitService = new BatchJoinSplitService(darkPoolContext.darkPool);
          let amountAccumulated = 0n;
          let i = 0;
          
          for (const note of notes){
            amountAccumulated += note.amount;
            if (amountAccumulated < amount){
              i++;
            } else {
              break;
            }
          }

          if (amountAccumulated < amount) {
            return null;
          }

          if (i <=5 ){
            const notesToJoin = notes.slice(0, i+1);    
            const {context, outNotes} = await batchJoinSplitService.prepare(notesToJoin, amount, darkPoolContext.signature);
            const ids : number[] = [];

            for(let j = 0; i < outNotes.length; j++) {
              ids[j] = await dbservice.addNote(
                darkPoolContext.chainId, 
                darkPoolContext.publicKey, 
                darkPoolContext.walletAddress, 
                0, 
                outNotes[j].note,
                outNotes[j].rho, 
                outNotes[j].asset,
                outNotes[j].amount,
                3,
                '');
            }

            await batchJoinSplitService.generateProof(context);
            const tx = await batchJoinSplitService.execute(context);
            for(let j = 0; i < outNotes.length; j++) {
              await dbservice.updateNoteTransactionAndStatus(ids[j], tx);
            }

          return outNotes[0];

          } else {
            const firstFive = notes.slice(0, 5);
            const theRest = notes.slice(5);

            const firstFiveAmount = firstFive.reduce((acc, note) => acc + note.amount, 0n);
            const {context, outNotes} = await batchJoinSplitService.prepare(firstFive, firstFiveAmount, darkPoolContext.signature);
            const id = await dbservice.addNote(
              darkPoolContext.chainId, 
              darkPoolContext.publicKey, 
              darkPoolContext.walletAddress, 
              0, 
              outNotes[0].note,
              outNotes[0].rho, 
              outNotes[0].asset,
              outNotes[0].amount,
              3,
              '');
            await batchJoinSplitService.generateProof(context);
            const tx = await batchJoinSplitService.execute(context);
            await dbservice.updateNoteTransactionAndStatus(id, tx);
            const notesToProcess = [outNotes[0], ...theRest];
            return this.notesJoinSplit(notesToProcess, darkPoolContext, amount);
        }
      }
    }
  }